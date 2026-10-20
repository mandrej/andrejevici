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
import { ref as storageRef, getDownloadURL, deleteObject } from 'firebase/storage'
import { useTransferStore } from '@/stores/transferStore'
import {
  thumbName,
  thumbUrl,
  createThumbnailUrl,
  removeFromList,
  replaceInList,
  sliceSlug,
  getYouTubeId,
  formatDatum,
  getDateFields,
  dummy,
  isAuthorOrAdmin,
} from '@/helpers'
import notify from '@/helpers/notify'
import { useValuesStore } from '@/stores/valuesStore'
import { useBucketStore } from '@/stores/bucketStore'
import { useUserStore } from '@/stores/userStore'
import type { PhotoType, ExifType } from '@/helpers/models'
import { photoCollection, lastRecordCollection } from '@/helpers/collections'
import readExif from '@/helpers/exif'
import type { AppStore, PhotoOpsSliceState, PhotoOpsSliceActions } from '@/stores/app/types'

/** Fire-and-forget analytics; the SDK is loaded on demand so it stays off the first paint. */
const logAnalyticsEvent = (eventName: string, eventParams?: Record<string, unknown>) => {
  void import('@/analytics').then(({ trackEvent }) => trackEvent(eventName, eventParams))
}

/** True when a Storage delete failed because the object was already gone. */
const isObjectNotFound = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  (err as { code?: unknown }).code === 'storage/object-not-found'

/** Deleting an object that is already gone is a no-op; anything else still fails. */
const ignoreMissing = (promise: Promise<void>): Promise<void> =>
  promise.catch((err: unknown) => {
    if (!isObjectNotFound(err)) throw err
  })

/** How long to wait for the thumbnail trigger in development (12 × 500ms). */
const THUMB_WAIT_ATTEMPTS = 12
const THUMB_WAIT_INTERVAL = 500

/**
 * Resolves the thumbnail URL to store on a record.
 *
 * The `generateThumbnailOnUpload` trigger owns the bytes and lands the object shortly after
 * the original — reliably, but not instantly, so asking for it immediately after an upload
 * always loses that race. Production stores the predictive public URL (Storage serves reads
 * without a token), which needs no waiting. Development cannot use that URL: the emulator
 * serves objects from its own host behind a download token, so the predictive URL points at
 * the real bucket and 404s — a card whose thumbnail 404s shows the broken-image overlay,
 * which also sits over the image and swallows clicks. Wait for the trigger there instead.
 *
 * Only `saveRecord` uses this. `swapRecord` writes the predictive URL at once and relies on
 * its client-side preview, so it never waits on the trigger.
 */
const resolveThumbUrl = async (filename: string): Promise<string> => {
  const path = thumbName(filename)
  if (!path || process.env.NODE_ENV !== 'development') return thumbUrl(filename)

  for (let attempt = 0; attempt < THUMB_WAIT_ATTEMPTS; attempt++) {
    try {
      return await getDownloadURL(storageRef(storage(), path))
    } catch {
      await new Promise((resolve) => setTimeout(resolve, THUMB_WAIT_INTERVAL))
    }
  }

  // Last resort only: generation is best-effort and must never fail an upload or a swap.
  console.warn(`DEV: thumbnail not ready for ${path}, using predictive URL`)
  return thumbUrl(filename)
}

/** True for a browser-local preview URL (`blob:`/`data:`), which must never reach Firestore. */
const isDisplayThumb = (url: string | undefined): boolean =>
  typeof url === 'string' && (url.startsWith('blob:') || url.startsWith('data:'))

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

  completePhoto: async (rec, tags, headline, source) => {
    const dateFields = getDateFields(new Date())
    // Prefer the local File: reading EXIF from it avoids re-downloading the whole
    // original just to parse tags that live in the first few kilobytes.
    const exif = await readExif(source ?? rec.url)

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

    // A swap shows a client-side preview (`blob:`) for display only. Resolve the server-owned
    // URL before writing, so an edit of a just-swapped record never persists a local URL.
    if (isDisplayThumb(obj.thumb)) {
      obj.thumb = await resolveThumbUrl(obj.id)
    }

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
      obj.thumb = await resolveThumbUrl(obj.id)

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
        // Tolerate a missing object: a legacy record, or an image whose thumbnail
        // generation failed, should still be deletable without a spurious error.
        promises.push(ignoreMissing(deleteObject(stoRef)))

        const thumbPath = thumbName(obj.id)
        if (thumbPath) {
          promises.push(ignoreMissing(deleteObject(storageRef(storage(), thumbPath))))
        }
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

    // 1. The transfer owns the object name. It must: the bytes go to `handle.id`, so the record
    // has to be written under that same name rather than a second id minted here.
    //
    // The transfer covers the whole swap, not just the bytes — the segment stays on the header
    // until the record rewrite finishes, so the user is never left looking at a full bar and a
    // card that has not repainted. Registered before the try so a rejected transfer still has a
    // row to settle; the store owns that row's terminal state.
    const handle = useTransferStore.getState().startTransfer(newFile, 'swap')
    const newFilename = handle.id

    try {
      // 2. Upload new image to Storage. The transfer store runs `uploadBytesResumable`, so this
      // reports progress where `uploadBytes` could not; the original goes up byte-exact.
      const newDownloadUrl = await handle.promise

      // 3. Persisted thumbnail URL. The `generateThumbnailOnUpload` Storage trigger owns the
      // canonical bytes and writes them shortly after the new original lands. The swap does not
      // wait for the trigger: it stores the predictive public URL, and the client-side preview
      // below is what the card paints until the next record fetch. Production Storage serves the
      // predictive URL without a token.
      const newThumbUrl = thumbUrl(newFilename)

      // 3b. Display-only preview. The card must show the new image as soon as the swap returns,
      // so paint it from the local File while the server generates the real thumbnail. This blob
      // URL stays in local state and is never written to Firestore.
      const displayThumbUrl = await createThumbnailUrl(newFile)

      // 4. Read EXIF from the local file (no re-download of the just-uploaded image)
      let exif: ExifType | null = null
      try {
        exif = await readExif(newFile)
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

      // 6. Save new record to Firestore. It keeps the server thumbnail URL; the client preview
      // below only ever exists in local state.
      const newDocRef = doc(photoCollection(), newRecord.id)
      await setDoc(newDocRef, newRecord)

      // Local copy the gallery paints from: identical to the persisted record except that it
      // carries the client-side preview so the swapped image shows immediately.
      const localRecord: PhotoType = displayThumbUrl
        ? { ...newRecord, thumb: displayThumbUrl }
        : newRecord

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

      // 9. Update local state with the preview-bearing copy
      set((state) => {
        const list = [...state.objects]
        const idx = list.findIndex((x) => x.id === oldRec.id)
        if (idx !== -1) {
          list[idx] = localRecord
        } else {
          list.unshift(localRecord)
        }
        return {
          objects: list,
          selected: state.selected.filter((x) => x.id !== oldRec.id),
          currentEdit: state.currentEdit?.id === oldRec.id ? localRecord : state.currentEdit,
          lastRecord: state.lastRecord?.id === oldRec.id ? localRecord : state.lastRecord,
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

      // 12. Return the local copy: it carries the preview so the caller's card paints at once.
      // The transfer's row is only now marked complete, which is what keeps the segment up for
      // the whole swap rather than just the byte transfer.
      handle.succeed()
      return localRecord
    } catch (err) {
      // Nothing has been written or deleted yet at the point a transfer rejects, so the old
      // record survives intact and the user can simply retry.
      handle.fail(err)
      throw err
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
