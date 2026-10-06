import type { StateCreator } from 'zustand'
import { auth, storage } from '@/firebase'
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore'
import { ref as storageRef, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'
import CONFIG from '@/config'
import {
  thumbName,
  thumbUrl,
  removeFromList,
  replaceInList,
  sliceSlug,
  getYouTubeId,
  formatDatum,
  getDateFields,
  dummy,
  createThumbnailBlob,
  isAuthorOrAdmin,
} from '@/helpers'
import notify from '@/helpers/notify'
import { useValuesStore } from '@/stores/valuesStore'
import { useBucketStore } from '@/stores/bucketStore'
import { useUserStore } from '@/stores/userStore'
import type { PhotoType, ExifType } from '@/helpers/models'
import { photoCollection, lastRecordCollection } from '@/helpers/collections'
import readExif from '@/helpers/exif'
import { generateThumbnail } from '@/helpers/remedy'
import type { AppStore, PhotoOpsSliceState, PhotoOpsSliceActions } from '@/stores/app/types'

/** Fire-and-forget analytics; the SDK is loaded on demand so it stays off the first paint. */
const logAnalyticsEvent = (eventName: string, eventParams?: Record<string, unknown>) => {
  void import('@/analytics').then(({ trackEvent }) => trackEvent(eventName, eventParams))
}

const getRec = (snapshot: { docs: Array<{ id: string; data: () => unknown }> }) => {
  if (!snapshot.docs.length) return null
  const docSnap = snapshot.docs[0]
  const raw = docSnap.data() as object
  return { id: docSnap.id, ...raw }
}

export const createPhotoOpsSlice: StateCreator<
  AppStore,
  [],
  [],
  PhotoOpsSliceState & PhotoOpsSliceActions
> = (set, get) => ({
  uploaded: [],
  currentEdit: {} as PhotoType,
  lastRecord: null,

  setCurrentEdit: (currentEdit) => set({ currentEdit }),

  setUploaded: (uploaded) =>
    set((state) => ({
      uploaded: typeof uploaded === 'function' ? uploaded(state.uploaded) : uploaded,
    })),

  completePhoto: async (rec, tags, headline) => {
    const dateFields = getDateFields(new Date())
    const exif = await readExif(rec.url)

    const tmp: PhotoType = {
      ...rec,
      id: rec.id,
      kind: 'photo',
      ...dateFields,
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
    const docRef = doc(photoCollection(), obj.id)
    const valuesStore = useValuesStore.getState()
    const bucketStore = useBucketStore.getState()
    const userStore = useUserStore.getState()

    if (!obj.kind) obj.kind = 'photo'

    if (obj.thumb) {
      const oldDoc = get().objects.find((x) => x.id === obj.id)
      await setDoc(docRef, obj, { merge: true })

      set((state) => {
        const list = [...state.objects]
        replaceInList(list, obj)
        return { objects: list }
      })

      valuesStore.updateCounters(oldDoc || obj, obj)
      notify({ type: 'positive', message: `${obj.id} updated`, icon: 'sym_r_check' })
    } else {
      if (process.env.NODE_ENV === 'development') {
        try {
          const thumbRef = storageRef(storage(), thumbName(obj.id))
          obj.thumb = await getDownloadURL(thumbRef)
        } catch (e) {
          console.warn('DEV: Thumbnail not yet ready, using predictive URL', e)
          obj.thumb = thumbUrl(obj.id)
        }
      } else {
        obj.thumb = thumbUrl(obj.id)
      }

      await setDoc(docRef, obj, { merge: true })
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
        filename: obj.id,
        headline: obj.headline,
        kind: obj.kind,
      })

      set({ find: { year: obj.year, month: obj.month, day: obj.day } })
      await get().fetchRecords(true)

      notify({ type: 'positive', message: `${obj.id} published`, icon: 'sym_r_check' })
    }

    set({ currentEdit: obj })
    return obj
  },

  saveVideo: async (obj) => {
    obj.kind = 'video'
    const ytId = getYouTubeId(obj.url)
    if (ytId) {
      obj.thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
    }

    const docRef = doc(photoCollection(), obj.id)
    const valuesStore = useValuesStore.getState()
    const userStore = useUserStore.getState()

    await setDoc(docRef, obj, { merge: true })
    valuesStore.updateCounters(null, obj)

    logAnalyticsEvent('published', {
      when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
      who: userStore.user?.email ? dummy(userStore.user?.email) : 'anonymous',
      filename: obj.id,
      headline: obj.headline,
      kind: obj.kind,
    })

    set({ find: { year: obj.year, month: obj.month, day: obj.day } })
    await get().fetchRecords(true)

    notify({
      type: 'positive',
      message: `${obj.id} video published`,
      icon: 'sym_r_check',
    })
    return obj
  },

  deleteRecord: async (obj) => {
    const docRef = doc(photoCollection(), obj.id)
    const valuesStore = useValuesStore.getState()
    const bucketStore = useBucketStore.getState()
    const userStore = useUserStore.getState()

    logAnalyticsEvent('image_delete', {
      when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
      who: userStore.user?.email ? dummy(userStore.user?.email) : 'anonymous',
      filename: obj.id,
      headline: obj.headline || '',
      kind: obj.kind,
    })

    try {
      const promises: Promise<void>[] = [deleteDoc(docRef)]
      if (obj.kind !== 'video') {
        const stoRef = storageRef(storage(), obj.id)
        const thumbRef = storageRef(storage(), thumbName(obj.id))
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
        group: obj.id,
        message: `${obj.id} ${String(err)}`,
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
    } else {
      set((state) => {
        const list = [...state.uploaded]
        removeFromList(list, obj)
        return { uploaded: list }
      })
    }

    notify({
      type: 'positive',
      message: `${obj.id} deleted`,
      icon: 'sym_r_check',
    })
  },

  swapRecord: async (oldRec, newFile) => {
    if (oldRec.kind === 'video') {
      throw new Error('Cannot swap video files')
    }
    const userStore = useUserStore.getState()
    if (!isAuthorOrAdmin(userStore.user, oldRec)) {
      throw new Error('Not authorized to swap this image')
    }

    set({ busy: true })
    const valuesStore = useValuesStore.getState()
    const bucketStore = useBucketStore.getState()

    try {
      // 1. Generate unique filename for the new image
      const id = uuidv4().substring(0, 8)
      const newFilename = `${id}_${newFile.name}`

      // 2. Upload new image to Storage
      const fileRef = storageRef(storage(), newFilename)
      await uploadBytes(fileRef, newFile, {
        contentType: newFile.type,
        cacheControl: CONFIG.cache_control,
      })
      const newDownloadUrl = await getDownloadURL(fileRef)

      // 3. Make and upload thumbnail
      let newThumbUrl = ''
      try {
        const thumbBlob = await createThumbnailBlob(newFile, CONFIG.thumbSize)
        const thumbPath = thumbName(newFilename)
        const thumbStoRef = storageRef(storage(), thumbPath)
        await uploadBytes(thumbStoRef, thumbBlob, {
          contentType: 'image/jpeg',
          cacheControl: CONFIG.cache_control,
        })
        newThumbUrl = await getDownloadURL(thumbStoRef)
      } catch (thumbErr) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            'Client thumbnail creation failed, trying Cloud Function fallback:',
            thumbErr,
          )
        }
        try {
          const res = await generateThumbnail(newFilename)
          const thumbRef = storageRef(storage(), res.data.filePath)
          newThumbUrl = await getDownloadURL(thumbRef)
        } catch (cfErr) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Cloud Function thumbnail failed, falling back to predictive URL:', cfErr)
          }
          newThumbUrl = thumbUrl(newFilename)
        }
      }

      // 4. Read EXIF from new image
      let exif: ExifType | null = null
      try {
        exif = await readExif(newDownloadUrl)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to read EXIF from new image:', e)
        }
      }

      // 5. Build new record: headline and tags remain, update EXIF
      const dateFields = getDateFields(new Date())
      const headline = oldRec.headline || ''
      const updatedTags = new Set(oldRec.tags || [])
      if (exif?.flash) {
        updatedTags.add('flash')
      } else if (exif && exif.flash === false) {
        updatedTags.delete('flash')
      }

      const newRecord: PhotoType = {
        id: newFilename,
        url: newDownloadUrl,
        thumb: newThumbUrl,
        size: newFile.size,
        kind: 'photo',
        email: oldRec.email || userStore.user?.email || '',
        nick: oldRec.nick || userStore.user?.nick || '',
        headline,
        text: headline ? sliceSlug(headline) : [],
        tags: [...updatedTags],
        ...dateFields,
        ...(exif || {}),
        ...(oldRec.loc && !exif?.loc ? { loc: oldRec.loc } : {}),
      }

      // 6. Save new record to Firestore
      const newDocRef = doc(photoCollection(), newRecord.id)
      await setDoc(newDocRef, newRecord)

      // 7. Delete old record from Firestore
      const oldDocRef = doc(photoCollection(), oldRec.id)
      await deleteDoc(oldDocRef)

      // 8. Delete old image and thumbnail from Cloud Storage
      const oldStoragePromises: Promise<unknown>[] = []
      const oldFileRef = storageRef(storage(), oldRec.id)
      oldStoragePromises.push(
        deleteObject(oldFileRef).catch((e) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Could not delete old image from storage:', e)
          }
        }),
      )
      const oldThumbPath = thumbName(oldRec.id)
      if (oldThumbPath) {
        oldStoragePromises.push(
          deleteObject(storageRef(storage(), oldThumbPath)).catch((e) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Could not delete old thumbnail from storage:', e)
            }
          }),
        )
      }
      await Promise.allSettled(oldStoragePromises)

      // 9. Update local state
      set((state) => {
        const list = [...state.objects]
        const idx = list.findIndex((x) => x.id === oldRec.id)
        if (idx !== -1) {
          list[idx] = newRecord
        } else {
          list.unshift(newRecord)
        }
        return {
          objects: list,
          selected: state.selected.filter((x) => x.id !== oldRec.id),
          currentEdit: state.currentEdit?.id === oldRec.id ? newRecord : state.currentEdit,
          lastRecord: state.lastRecord?.id === oldRec.id ? newRecord : state.lastRecord,
        }
      })

      // 10. Update counters and bucket size
      valuesStore.updateCounters(oldRec, newRecord)
      bucketStore.bucketDiff(newRecord.size - oldRec.size)

      // 11. Log analytics events
      logAnalyticsEvent('image_delete', {
        when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
        who: userStore.user?.email ? dummy(userStore.user?.email) : 'anonymous',
        filename: oldRec.id,
        headline: oldRec.headline || '',
        kind: oldRec.kind,
      })
      logAnalyticsEvent('published', {
        when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
        who: userStore.user?.email ? dummy(userStore.user?.email) : 'anonymous',
        filename: newRecord.id,
        headline: newRecord.headline,
        kind: newRecord.kind,
      })

      notify({
        group: 'swap',
        type: 'positive',
        message: `${oldRec.id} swapped with ${newRecord.id}`,
        icon: 'sym_r_check',
        timeout: 3000,
        spinner: false,
      })

      return newRecord
    } finally {
      set({ busy: false })
    }
  },

  subscribeLastRec: () => {
    const lastDocRef = doc(lastRecordCollection(), 'latest')

    const saveLastRecordToTable = async (rec: PhotoType | null) => {
      if (!auth().currentUser) return
      try {
        if (rec) {
          await setDoc(lastDocRef, rec, { merge: true })
        } else {
          await deleteDoc(lastDocRef)
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to save lastRecord to LastRecord table:', err)
        }
      }
    }

    // Check on start for any saved lastRecord in LastRecord table; if not exist, query from scratch
    getDoc(lastDocRef)
      .then(async (snap) => {
        if (snap.exists()) {
          const rec = { id: snap.id, ...(snap.data() as object) } as PhotoType
          set({ lastRecord: rec })
        } else {
          const q = query(photoCollection(), orderBy('date', 'desc'), limit(1))
          const querySnap = await getDocs(q)
          const rec = getRec(querySnap) as PhotoType | null
          set({ lastRecord: rec })
          if (rec && auth().currentUser) {
            void saveLastRecordToTable(rec)
          }
        }
      })
      .catch((error) => {
        console.error('Error checking LastRecord table on start:', error)
      })

    // Listen to changes on photoCollection() and update appStore and LastRecord table on every change
    const q = query(photoCollection(), orderBy('date', 'desc'), limit(1))
    return onSnapshot(
      q,
      (snapshot) => {
        const rec = getRec(snapshot) as PhotoType | null
        set({ lastRecord: rec })
        if (auth().currentUser) {
          void saveLastRecordToTable(rec)
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('Last record snapshot:', rec?.headline, rec?.date)
        }
      },
      (error) => {
        console.error('Failed to listen to last record snapshot:', error)
      },
    )
  },
})
