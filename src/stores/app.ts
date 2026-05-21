import { defineStore, acceptHMRUpdate } from 'pinia'
import { storage } from '../firebase'
import { LocalStorage, Dark } from 'quasar'
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
} from '../helpers'
import CONFIG from '../config'
import notify from '../helpers/notify'
import { useValuesStore } from './values'
import { useBucketStore } from './bucket'
import router from '../router'
import type {
  QuerySnapshot,
  DocumentSnapshot,
  DocumentData,
  QueryConstraint,
  QueryFieldFilterConstraint,
  QueryDocumentSnapshot,
} from '@firebase/firestore'
import type { FindType, PhotoType, AppStoreState, VideoType } from '../helpers/models'
import { photoCollection } from '../helpers/collections'
import readExif from 'src/helpers/exif'

/**
 * Retrieves the data of the first document from a QuerySnapshot, or null if the snapshot is empty.
 * @param snapshot The QuerySnapshot containing document data.
 * @returns The data of the first document in the snapshot, or null if no documents are present.
 */
const getRec = (snapshot: QuerySnapshot<DocumentData>) =>
  snapshot.docs.length ? snapshot.docs[0]?.data() : null

/**
 * Checks if all elements of a target array are present in a source array.
 * @template T The type of elements in the arrays.
 * @param arr The source array to check against.
 * @param target The target array to check for presence in the source array.
 * @returns True if all elements of the target array are present in the source array, false otherwise.
 */
const includeSub = <T>(arr: T[], target: T[]): boolean => target.every((v) => arr.includes(v))

/**
 * Creates a Pinia store for the application.
 * @returns The application store instance.
 */
/** Applies the theme to Quasar's Dark mode */
const applyTheme = (theme: 'light' | 'dark' | 'auto') =>
  Dark.set(theme === 'auto' ? 'auto' : theme === 'dark')

export const useAppStore = defineStore('app', {
  state: (): AppStoreState => ({
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
    theme: (LocalStorage.getItem('theme') as 'light' | 'dark' | 'auto') || 'auto',
  }),
  persist: {
    pick: ['lastRecord', 'find', 'uploaded', 'adminTab', 'addTab', 'metaTab', 'theme'],
  },
  actions: {
    /**
     * Searches for records based on multiple field-value pairs and opens the list page.
     *  @param criteria An object containing the search criteria.
     */
    searchBy(criteria: FindType) {
      this.find = fixQuery(criteria)
      void this.fetchRecords(true)
      void router.push({ name: 'list' })
    },

    /**
     * Fetches a single photo record by filename.
     * @param {string} filename - The filename of the photo to fetch.
     * @return {Promise<PhotoType | null>} The photo record if found, otherwise null.
     */
    async fetchPhoto(filename: string): Promise<PhotoType | null> {
      const existing = this.objects.find((x) => x.filename === filename)
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

    /**
     * Fetches a list of records based on the search criteria.
     *
     * @param {boolean} reset - If true, resets the list of records to an empty array before fetching.
     * @return {Promise<{ objects: PhotoType[], error: string | null, next: string | null }>} A promise that resolves to an object containing the fetched records, an error message (if any), and the ID of the next record (if any).
     */
    async fetchRecords(reset = false) {
      if (this.busy) return

      const max =
        CONFIG.limit *
        (this.find?.tags ? this.find.tags.length + 2 : 1) *
        (this.find?.text ? sliceSlug(this.find.text).length : 1)

      const filters: QueryFieldFilterConstraint[] = Object.entries(this.find || {}).map(
        ([key, val]) => {
          if (key === 'tags') {
            return where(key, 'array-contains-any', val)
          } else if (key === 'text') {
            return where(key, 'array-contains-any', sliceSlug(val as string))
          } else if (key === 'kind') {
            return where(key, '==', val)
          } else {
            return where(key, '==', val)
          }
        },
      )

      const constraints: Array<QueryConstraint> = [...filters, orderBy('date', 'desc')]
      this.busy = true
      if (reset) this.next = ''
      if (this.next != '') {
        const cursor: DocumentSnapshot = await getDoc(doc(photoCollection, this.next))
        constraints.push(startAfter(cursor))
      }
      constraints.push(limit(max))
      try {
        const querySnapshot: QuerySnapshot = await getDocs(query(photoCollection, ...constraints))
        if (reset) this.objects.length = 0
        const existingIds = new Set(this.objects.map((x) => x.filename))
        querySnapshot.forEach((d: QueryDocumentSnapshot) => {
          const data = d.data() as PhotoType
          if (!existingIds.has(data.filename)) {
            this.objects.push(data)
          }
        })
        const next = querySnapshot.docs[querySnapshot.docs.length - 1]
        this.next = querySnapshot.docs.length < max ? '' : next?.id || ''
      } catch (err) {
        this.error = (err as Error).message
        this.busy = false
        return { objects: [] as PhotoType[], error: (err as Error).message, next: '' }
      }

      if (this.find?.tags) {
        this.objects = this.objects.filter((d) =>
          includeSub(d.tags as string[], this.find?.tags as string[]),
        )
      }
      if (this.find?.text) {
        this.objects = this.objects.filter((d) =>
          includeSub(d.text as string[], sliceSlug(this.find?.text || '')),
        )
      }

      this.error = this.objects.length === 0 ? 'empty' : ''
      this.busy = false
      if (process.env.DEV)
        console.log('FETCH ' + JSON.stringify(this.find, null, 2) + ' with next: ' + this.next)
    },

    /**
     * Completes a photo record with additional metadata after upload.
     * @param rec - The photo record to complete.
     * @param tags - Additional tags to apply to the photo.
     * @param headline - The headline to apply to the photo.
     * @returns A promise that resolves to the completed photo record.
     */
    async completePhoto(rec: PhotoType, tags: string[], headline: string): Promise<PhotoType> {
      // url, filename, size, email, nick exist from uploadTask
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

      // Sync 'flash' tag with EXIF data
      const updatedTags = new Set(tmp.tags)
      if (tmp.flash) {
        updatedTags.add('flash')
      } else {
        updatedTags.delete('flash')
      }
      tmp.tags = [...updatedTags]
      return tmp
    },

    /**
     * Saves a photo record to the Firestore database, and updates corresponding
     * statistics. If the photo has a thumbnail, it updates the record and
     * decreases the old stats. If not, it sets the thumbnail URL, updates the
     * record, increases the stats, and deletes the uploaded file.
     *
     * @param {PhotoType} obj - The photo record to save.
     * @return {Promise<PhotoType>} The saved photo record.
     */
    async saveRecord(obj: PhotoType): Promise<PhotoType> {
      const docRef = doc(photoCollection, obj.filename)
      const meta = useValuesStore()
      const bucket = useBucketStore()
      if (!obj.kind) obj.kind = 'photo'

      if (obj.thumb) {
        const oldDoc = this.objects.find((x) => x.filename === obj.filename)
        await setDoc(docRef, obj, { merge: true })
        replaceInList(this.objects, obj)

        meta.updateCounters(oldDoc || obj, obj)
        notify({ type: 'positive', message: `${obj.filename} updated`, icon: 'sym_r_check' })
      } else {
        // set thumbnail url = publish
        if (process.env.DEV) {
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
        // save everything
        await setDoc(docRef, obj, { merge: true })
        this.updateLastRecord(obj)
        bucket.bucketDiff(obj.size)
        meta.updateCounters(null, obj)
        // delete uploaded
        removeFromList(this.uploaded, obj)

        // set find on new added image and fetch
        this.find = { year: obj.year, month: obj.month, day: obj.day }
        await this.fetchRecords(true)

        notify({ type: 'positive', message: `${obj.filename} published`, icon: 'sym_r_check' })
      }
      this.currentEdit = obj
      // if (process.env.DEV) console.log('RECORD: ' + JSON.stringify(obj, null, 2))
      return obj
    },

    /**
     * Saves a video record to the Firestore database.
     *
     * @param {VideoType} obj - The video record to save.
     * @return {Promise<VideoType>} The saved video record.
     */
    async saveVideo(obj: VideoType): Promise<VideoType> {
      obj.kind = 'video'
      const id = getYouTubeId(obj.url)
      if (id) {
        obj.thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`
      }
      const docRef = doc(photoCollection, obj.filename)
      const meta = useValuesStore()
      await setDoc(docRef, obj, { merge: true })
      this.updateLastRecord(obj)
      meta.updateCounters(null, obj)

      // set find on new added image and fetch
      this.find = { year: obj.year, month: obj.month, day: obj.day }
      await this.fetchRecords(true)

      notify({ type: 'positive', message: `${obj.filename} video published`, icon: 'sym_r_check' })
      return obj
    },

    /**
     * Deletes a record from the Firestore database and corresponding statistics
     * if the record has a thumbnail, or deletes the record and uploaded file
     * if not.
     *
     * @param {PhotoType} obj - The record to delete.
     * @return {Promise<void>} A promise that resolves when the deletion is
     * complete.
     */
    async deleteRecord(obj: PhotoType) {
      const docRef = doc(photoCollection, obj.filename)
      const meta = useValuesStore()
      const bucket = useBucketStore()

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
        notify({
          type: 'error',
          group: obj.filename,
          message: `${obj.filename} ${String(err)}`,
        })
      }

      if (obj.thumb) {
        removeFromList(this.objects, obj)

        bucket.bucketDiff(-obj.size)
        meta.updateCounters(obj, null)
        if (obj.date === this.lastRecord?.date) {
          this.fetchLastRec()
        }
      } else {
        removeFromList(this.uploaded, obj)
      }
      notify({
        type: 'positive',
        message: `${obj.filename} deleted`,
        icon: 'sym_r_check',
      })
    },

    /**
     * Retrieves the most recent photo from the Firestore database.
     *
     * @return {Promise<PhotoType | null>} A promise that resolves to the last photo
     * taken, or null if no photos are found.
     */
    async fetchLastRec(): Promise<PhotoType | null> {
      try {
        const querySnapshot = await getDocs(
          query(photoCollection, orderBy('date', 'desc'), limit(1)),
        )
        const rec = getRec(querySnapshot) as PhotoType
        this.lastRecord = rec
        return rec
      } catch (error) {
        console.error('Failed to get last record:', error)
        return null
      }
    },

    /**
     * Updates the last record if the given object is more recent.
     * @param obj The object to compare with the last record.
     */
    updateLastRecord(obj: PhotoType) {
      if (
        !this.lastRecord ||
        (obj.date && (!this.lastRecord.date || obj.date > this.lastRecord.date))
      ) {
        this.lastRecord = { ...obj }
      }
    },

    /**
     * Sets the application theme and persists it to local storage.
     * @param theme The theme to set ('light', 'dark', or 'auto').
     */
    setTheme(theme: 'light' | 'dark' | 'auto') {
      this.theme = theme
      LocalStorage.set('theme', theme)
      applyTheme(theme)
    },

    /**
     * Initializes the theme from local storage.
     */
    initTheme() {
      applyTheme(this.theme)
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
