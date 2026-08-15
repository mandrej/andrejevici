import type { StateCreator } from 'zustand'
import { storage, logAnalyticsEvent } from '@/firebase'
import { doc, setDoc, deleteDoc, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { ref as storageRef, getDownloadURL, deleteObject } from 'firebase/storage'
import {
  thumbName,
  thumbUrl,
  removeFromList,
  replaceInList,
  sliceSlug,
  getYouTubeId,
  formatDatum,
  dummy,
} from '@/helpers'
import CONFIG from '@/config'
import notify from '@/helpers/notify'
import { useValuesStore } from '@/stores/valuesStore'
import { useBucketStore } from '@/stores/bucketStore'
import { useUserStore } from '@/stores/userStore'
import type { PhotoType } from '@/helpers/models'
import { photoCollection } from '@/helpers/collections'
import readExif from '@/helpers/exif'
import type { AppStore, PhotoOpsSliceState, PhotoOpsSliceActions } from '@/stores/app/types'

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
    const datum = new Date()
    const exif = await readExif(rec.url)

    const tmp: PhotoType = {
      ...rec,
      id: rec.id,
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
    const docRef = doc(photoCollection, obj.id)
    const valuesStore = useValuesStore.getState()
    const bucketStore = useBucketStore.getState()
    const userStore = useUserStore.getState()

    if (!obj.kind) obj.kind = 'photo'

    if (obj.thumb) {
      const oldDoc = get().objects.find((x) => x.id === obj.id)
      await setDoc(docRef, obj, { merge: true })
      get().updateLastRecord(obj)

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
          const thumbRef = storageRef(storage, thumbName(obj.id))
          obj.thumb = await getDownloadURL(thumbRef)
        } catch (e) {
          console.warn('DEV: Thumbnail not yet ready, using predictive URL', e)
          obj.thumb = thumbUrl(obj.id)
        }
      } else {
        obj.thumb = thumbUrl(obj.id)
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

    const docRef = doc(photoCollection, obj.id)
    const valuesStore = useValuesStore.getState()
    const userStore = useUserStore.getState()

    await setDoc(docRef, obj, { merge: true })
    get().updateLastRecord(obj)
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
    const docRef = doc(photoCollection, obj.id)
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
        const stoRef = storageRef(storage, obj.id)
        const thumbRef = storageRef(storage, thumbName(obj.id))
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
      message: `${obj.id} deleted`,
      icon: 'sym_r_check',
    })
  },

  fetchLastRec: async () => {
    try {
      const querySnapshot = await getDocs(query(photoCollection, orderBy('date', 'desc'), limit(1)))
      const rec = getRec(querySnapshot) as PhotoType
      set({ lastRecord: rec })
      return rec
    } catch (error) {
      console.error('Failed to get last record:', error)
      return null
    }
  },

  updateLastRecord: async (_obj) => {
    return await get().fetchLastRec()
  },
})
