import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storage, logAnalyticsEvent } from '../firebase'
import {
  doc,
  query,
  where,
  limit,
  orderBy,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  startAfter,
} from 'firebase/firestore'
import { ref as storageRef, getDownloadURL, deleteObject } from 'firebase/storage'
import {
  thumbName,
  thumbUrl,
  removeFromList,
  replaceInList,
  sliceSlug,
  fixQuery,
  getYouTubeId,
  formatDatum,
  dummy,
} from '../helpers'
import CONFIG from '../config'
import notify from '../helpers/notify'
import { useValuesStore } from './valuesStore'
import { useBucketStore } from './bucketStore'
import { useUserStore } from './userStore'
import type {
  QuerySnapshot,
  DocumentSnapshot,
  DocumentData,
  QueryConstraint,
  QueryFieldFilterConstraint,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import type { FindType, PhotoType, AppStoreState, VideoType, AssetKind, ValuesState, FileProgress } from '../helpers/models'
import { photoCollection } from '../helpers/collections'
import readExif from '../helpers/exif'

const getRec = (snapshot: QuerySnapshot<DocumentData>) =>
  snapshot.docs.length ? snapshot.docs[0]?.data() : null

const includeSub = <T>(arr: T[], target: T[]): boolean => target.every((v) => arr.includes(v))

const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.add(theme)
  }
}

interface AppStoreActions {
  searchBy: (criteria: FindType, onNavigate?: () => void) => void
  fetchPhoto: (filename: string) => Promise<PhotoType | null>
  fetchRecords: (reset?: boolean) => Promise<{ objects: PhotoType[]; error: string | null; next: string | null } | void>
  completePhoto: (rec: PhotoType, tags: string[], headline: string) => Promise<PhotoType>
  saveRecord: (obj: PhotoType) => Promise<PhotoType>
  saveVideo: (obj: VideoType) => Promise<VideoType>
  deleteRecord: (obj: PhotoType) => Promise<void>
  fetchLastRec: () => Promise<PhotoType | null>
  updateLastRecord: (obj: PhotoType) => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  initTheme: () => void
  setBusy: (busy: boolean) => void
  setError: (error: string) => void
  setShowEdit: (showEdit: boolean) => void
  setShowConfirm: (showConfirm: boolean) => void
  setShowCarousel: (showCarousel: boolean) => void
  setSelected: (selected: PhotoType[] | ((prev: PhotoType[]) => PhotoType[])) => void
  setAdminTab: (tab: string) => void
  setAddTab: (tab: AssetKind) => void
  setMetaTab: (tab: keyof ValuesState['values']) => void
  setCurrentEdit: (edit: PhotoType) => void
  setProgressInfo: (info: FileProgress) => void
  setUploaded: (uploaded: PhotoType[] | ((prev: PhotoType[]) => PhotoType[])) => void
}

export type AppStore = AppStoreState & AppStoreActions

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      find: {},
      uploaded: [],
      objects: [],
      next: '',
      currentEdit: {} as PhotoType,
      lastRecord: null,
      busy: false,
      progressInfo: {},
      error: '',
      showEdit: false,
      showConfirm: false,
      showCarousel: false,
      adminTab: 'repair',
      addTab: 'photo',
      metaTab: 'tags',
      selected: [],
      theme: 'auto', // Will fall back to auto/persisted inside layout client-side

      setBusy: (busy) => set({ busy }),
      setError: (error) => set({ error }),
      setShowEdit: (showEdit) => set({ showEdit }),
      setShowConfirm: (showConfirm) => set({ showConfirm }),
      setShowCarousel: (showCarousel) => set({ showCarousel }),
      setSelected: (selected) => set((state) => ({ selected: typeof selected === 'function' ? selected(state.selected) : selected })),
      setAdminTab: (adminTab) => set({ adminTab }),
      setAddTab: (addTab) => set({ addTab }),
      setMetaTab: (metaTab) => set({ metaTab }),
      setCurrentEdit: (currentEdit) => set({ currentEdit }),
      setProgressInfo: (progressInfo) => set({ progressInfo }),
      setUploaded: (uploaded) => set((state) => ({ uploaded: typeof uploaded === 'function' ? uploaded(state.uploaded) : uploaded })),

      searchBy: (criteria, onNavigate) => {
        const queryCleaned = fixQuery(criteria)
        set({ find: queryCleaned })
        void get().fetchRecords(true)
        if (onNavigate) onNavigate()
      },

      fetchPhoto: async (filename) => {
        const existing = get().objects.find((x) => x.filename === filename)
        if (existing) return existing

        try {
          const docRef = doc(photoCollection, filename)
          const docSnap = await getDoc(docRef)
          return docSnap.exists() ? (docSnap.data() as PhotoType) : null
        } catch (err) {
          console.error('Failed to fetch photo:', err)
          return null
        }
      },

      fetchRecords: async (reset = false) => {
        if (get().busy) return

        const findCriteria = get().find
        const max =
          CONFIG.limit *
          (findCriteria?.tags ? findCriteria.tags.length + 2 : 1) *
          (findCriteria?.text ? sliceSlug(findCriteria.text).length : 1)

        const filters: QueryFieldFilterConstraint[] = Object.entries(findCriteria || {}).map(
          ([key, val]) => {
            if (key === 'tags') {
              return where(key, 'array-contains-any', val)
            } else if (key === 'text') {
              return where(key, 'array-contains-any', sliceSlug(val as string))
            } else {
              return where(key, '==', val)
            }
          },
        )

        const constraints: Array<QueryConstraint> = [...filters, orderBy('date', 'desc')]
        set({ busy: true })

        let currentNext = reset ? '' : get().next
        if (reset) {
          set({ next: '' })
        }

        if (currentNext !== '') {
          const cursor: DocumentSnapshot = await getDoc(doc(photoCollection, currentNext))
          constraints.push(startAfter(cursor))
        }
        constraints.push(limit(max))

        try {
          const querySnapshot: QuerySnapshot = await getDocs(query(photoCollection, ...constraints))
          const currentObjects = reset ? [] : [...get().objects]
          const existingIds = new Set(currentObjects.map((x) => x.filename))

          querySnapshot.forEach((d: QueryDocumentSnapshot) => {
            const data = d.data() as PhotoType
            if (!existingIds.has(data.filename)) {
              currentObjects.push(data)
            }
          })

          const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1]
          const nextVal = querySnapshot.docs.length < max ? '' : lastDoc?.id || ''

          let filteredObjects = currentObjects
          if (findCriteria?.tags) {
            filteredObjects = filteredObjects.filter((d) =>
              includeSub(d.tags as string[], findCriteria.tags as string[]),
            )
          }
          if (findCriteria?.text) {
            filteredObjects = filteredObjects.filter((d) =>
              includeSub(d.text as string[], sliceSlug(findCriteria.text || '')),
            )
          }

          set({
            objects: filteredObjects,
            next: nextVal,
            error: filteredObjects.length === 0 ? 'empty' : '',
            busy: false,
          })

          if (process.env.NODE_ENV === 'development') {
            console.log('FETCH ' + JSON.stringify(findCriteria, null, 2) + ' with next: ' + nextVal)
          }

          return { objects: filteredObjects, error: null, next: nextVal }
        } catch (err) {
          const errMsg = (err as Error).message
          set({ error: errMsg, busy: false })
          return { objects: [], error: errMsg, next: '' }
        }
      },

      completePhoto: async (rec, tags, headline) => {
        const datum = new Date()
        const exif = await readExif(rec.url)

        const tmp: PhotoType = {
          ...rec,
          kind: 'photo',
          date: formatDatum(datum, CONFIG.dateFormat),
          year: datum.getFullYear(),
          month: datum.getMonth() + 1,
          day: datum.getDate(),
          headline,
          text: sliceSlug(headline),
          tags,
          ...exif,
        }

        const updatedTags = new Set(tmp.tags)
        if (tmp.flash) {
          updatedTags.add('flash')
        } else {
          updatedTags.delete('flash')
        }
        tmp.tags = [...updatedTags]
        return tmp
      },

      saveRecord: async (obj) => {
        const docRef = doc(photoCollection, obj.filename)
        const valuesStore = useValuesStore.getState()
        const bucketStore = useBucketStore.getState()
        const userStore = useUserStore.getState()

        if (!obj.kind) obj.kind = 'photo'

        if (obj.thumb) {
          const oldDoc = get().objects.find((x) => x.filename === obj.filename)
          await setDoc(docRef, obj, { merge: true })

          set((state) => {
            const list = [...state.objects]
            replaceInList(list, obj)
            return { objects: list }
          })

          valuesStore.updateCounters(oldDoc || obj, obj)
          notify({ type: 'positive', message: `${obj.filename} updated`, icon: 'sym_r_check' })
        } else {
          if (process.env.NODE_ENV === 'development') {
            try {
              const thumbRef = storageRef(storage, thumbName(obj.filename))
              obj.thumb = await getDownloadURL(thumbRef)
            } catch (e) {
              console.warn('DEV: Thumbnail not yet ready, using predictive URL', e)
              obj.thumb = thumbUrl(obj.filename)
            }
          } else {
            obj.thumb = thumbUrl(obj.filename)
          }

          await setDoc(docRef, obj, { merge: true })
          get().updateLastRecord(obj)
          bucketStore.bucketDiff(obj.size)
          valuesStore.updateCounters(null, obj)

          set((state) => {
            const list = [...state.uploaded]
            removeFromList(list, obj)
            return { uploaded: list }
          })

          logAnalyticsEvent('published', {
            when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
            who: userStore.user?.email ? dummy(userStore.user?.email) : 'anonymous',
            filename: obj.filename,
            headline: obj.headline,
            kind: obj.kind,
          })

          set({ find: { year: obj.year, month: obj.month, day: obj.day } })
          await get().fetchRecords(true)

          notify({ type: 'positive', message: `${obj.filename} published`, icon: 'sym_r_check' })
        }

        set({ currentEdit: obj })
        return obj
      },

      saveVideo: async (obj) => {
        obj.kind = 'video'
        const id = getYouTubeId(obj.url)
        if (id) {
          obj.thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`
        }

        const docRef = doc(photoCollection, obj.filename)
        const valuesStore = useValuesStore.getState()
        const userStore = useUserStore.getState()

        await setDoc(docRef, obj, { merge: true })
        get().updateLastRecord(obj)
        valuesStore.updateCounters(null, obj)

        logAnalyticsEvent('published', {
          when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
          who: userStore.user?.email ? dummy(userStore.user?.email) : 'anonymous',
          filename: obj.filename,
          headline: obj.headline,
          kind: obj.kind,
        })

        set({ find: { year: obj.year, month: obj.month, day: obj.day } })
        await get().fetchRecords(true)

        notify({ type: 'positive', message: `${obj.filename} video published`, icon: 'sym_r_check' })
        return obj
      },

      deleteRecord: async (obj) => {
        const docRef = doc(photoCollection, obj.filename)
        const valuesStore = useValuesStore.getState()
        const bucketStore = useBucketStore.getState()
        const userStore = useUserStore.getState()

        logAnalyticsEvent('image_delete', {
          when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
          who: userStore.user?.email ? dummy(userStore.user?.email) : 'anonymous',
          filename: obj.filename,
          headline: obj.headline || '',
          kind: obj.kind,
        })

        try {
          const promises: Promise<void>[] = [deleteDoc(docRef)]
          if (obj.kind !== 'video') {
            const stoRef = storageRef(storage, obj.filename)
            const thumbRef = storageRef(storage, thumbName(obj.filename))
            promises.push(deleteObject(stoRef))
            promises.push(deleteObject(thumbRef))
          }
          await Promise.all(promises)
        } catch (err) {
          if (process.env.NODE_ENV === 'development') {
            console.error('deleteRecord failed with error:', err)
          }
          notify({
            type: 'negative',
            group: obj.filename,
            message: `${obj.filename} ${String(err)}`,
          })
        }

        if (obj.thumb) {
          set((state) => {
            const list = [...state.objects]
            removeFromList(list, obj)
            return { objects: list }
          })

          bucketStore.bucketDiff(-obj.size)
          valuesStore.updateCounters(obj, null)
          if (obj.date === get().lastRecord?.date) {
            get().fetchLastRec()
          }
        } else {
          set((state) => {
            const list = [...state.uploaded]
            removeFromList(list, obj)
            return { uploaded: list }
          })
        }

        notify({
          type: 'positive',
          message: `${obj.filename} deleted`,
          icon: 'sym_r_check',
        })
      },

      fetchLastRec: async () => {
        try {
          const querySnapshot = await getDocs(
            query(photoCollection, orderBy('date', 'desc'), limit(1)),
          )
          const rec = getRec(querySnapshot) as PhotoType
          set({ lastRecord: rec })
          return rec
        } catch (error) {
          console.error('Failed to get last record:', error)
          return null
        }
      },

      updateLastRecord: (obj) => {
        const lastRecord = get().lastRecord
        if (
          !lastRecord ||
          (obj.date && (!lastRecord.date || obj.date > lastRecord.date))
        ) {
          set({ lastRecord: { ...obj } })
        }
      },

      setTheme: (theme) => {
        set({ theme })
        if (typeof window !== 'undefined') {
          localStorage.setItem('theme', theme)
          applyTheme(theme)
        }
      },

      initTheme: () => {
        if (typeof window !== 'undefined') {
          const persistedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null
          const activeTheme = persistedTheme || get().theme || 'auto'
          if (activeTheme !== get().theme) {
            set({ theme: activeTheme })
          }
          applyTheme(activeTheme)
        }
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        lastRecord: state.lastRecord,
        find: state.find,
        uploaded: state.uploaded,
        adminTab: state.adminTab,
        addTab: state.addTab,
        metaTab: state.metaTab,
        theme: state.theme,
      }),
    },
  ),
)
