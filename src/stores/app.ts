import { defineStore, acceptHMRUpdate } from 'pinia'
import { storage, db } from 'src/boot/firebase'
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
  writeBatch,
} from 'firebase/firestore'
import { ref as storageRef, getDownloadURL, deleteObject } from 'firebase/storage'
import { thumbName, thumbUrl, removeFromList, replaceInList, sliceSlug } from 'src/helpers'
import CONFIG from 'app/config'
import notify from 'src/helpers/notify'
import { useValuesStore } from './values'
import type {
  QuerySnapshot,
  DocumentSnapshot,
  DocumentData,
  QueryConstraint,
  QueryFieldFilterConstraint,
  QueryDocumentSnapshot,
} from '@firebase/firestore'
import type {
  FindType,
  BucketType,
  PhotoType,
  AppStoreState,
  FileProgress,
  MessageType,
} from 'src/helpers/models'
import { photoCollection, messageCollection, bucketCollection } from 'src/helpers/collections'

const bucketRef = doc(bucketCollection, 'total')

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
export const useAppStore = defineStore('app', {
  state: (): AppStoreState => ({
    bucket: {
      size: 0,
      count: 0,
    } as BucketType,

    find: {} as FindType | null,
    uploaded: [] as PhotoType[],
    objects: [] as PhotoType[],
    next: '',
    currentEdit: {} as PhotoType,
    lastRecord: null as PhotoType | null,
    busy: false,
    progressInfo: {} as FileProgress,
    error: '',
    showEdit: false,
    showConfirm: false,
    showCarousel: false,
    adminTab: 'repair',
    selected: [] as PhotoType[],
    theme: (LocalStorage.getItem('theme') as 'light' | 'dark' | 'auto') || 'auto',
  }),
  getters: {
    // TODO not used
    recordCount: (state) => state.objects.length,
  },
  actions: {
    /**
     * Searches for records based on multiple field-value pairs.
     *  @param criteria An object containing the search criteria.
     */
    searchBy(criteria: FindType) {
      this.find = criteria
      this.fetchRecords(true)
    },

    /**
     * Reads the bucket data from the database and updates the store state.
     */
    async bucketRead() {
      const docSnap = await getDoc(bucketRef)
      if (docSnap.exists()) {
        this.bucket = docSnap.data() as BucketType
      } else {
        console.error('Failed to read bucket data')
      }
    },

    bucketDiff(num: number): void {
      // Update size and count in a single operation
      this.bucket.size += num
      this.bucket.count += num > 0 ? 1 : -1

      // Reset to zero if count becomes negative or zero
      if (this.bucket.count <= 0) {
        this.bucket.size = 0
        this.bucket.count = 0
      }

      setDoc(bucketRef, this.bucket, { merge: true })
      if (process.env.DEV) console.log('BUCKET: ' + JSON.stringify(this.bucket, null, 2))
    },

    /**
     * Builds the bucket by calculating the total size and count of photos.
     */
    async bucketBuild(): Promise<void> {
      const res = {
        count: 0,
        size: 0,
      }
      const q = query(photoCollection, orderBy('date', 'desc'))
      const querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        querySnapshot.forEach((d) => {
          res.count++
          res.size += d.data().size
        })
      }
      this.bucket = { ...res }
      setDoc(bucketRef, this.bucket, { merge: true })
      notify({ message: `Bucket size calculated` })
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
        (this.find?.tags?.length || 1) *
        (this.find?.text ? sliceSlug(this.find.text).length : 1)
      const filters: QueryFieldFilterConstraint[] = Object.entries(this.find || {}).map(
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
      if (reset) this.next = ''
      if (this.next != '') {
        const cursor: DocumentSnapshot = await getDoc(doc(photoCollection, this.next))
        constraints.push(startAfter(cursor))
      }
      constraints.push(limit(max))

      this.busy = true
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
        this.next = next && next.id !== this.next ? next.id : ''
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
      if (obj.thumb) {
        const oldDoc = this.objects.find((x) => x.filename === obj.filename)
        await setDoc(docRef, obj, { merge: true })
        replaceInList(this.objects, obj)

        meta.updateCounters(oldDoc || obj, obj)
        notify({ message: `${obj.filename} updated` })
      } else {
        // set thumbnail url = publish
        if (process.env.DEV) {
          const thumbRef = storageRef(storage, thumbName(obj.filename))
          obj.thumb = await getDownloadURL(thumbRef)
        } else {
          obj.thumb = thumbUrl(obj.filename)
        }
        // save everything
        await setDoc(docRef, obj, { merge: true })
        // update lastRecord only if it's newer than the current lastRecord
        if (
          !this.lastRecord ||
          (obj.date && (!this.lastRecord.date || obj.date > this.lastRecord.date))
        ) {
          this.lastRecord = { ...obj }
        }
        this.bucketDiff(obj.size)
        meta.updateCounters(null, obj)
        // delete uploaded
        removeFromList(this.uploaded, obj)

        // set find on new added image and fetch
        this.find = Object.assign(
          {},
          { year: obj.year, month: obj.month, day: obj.day },
        ) as FindType
        await this.fetchRecords(true)

        notify({ message: `${obj.filename} published` })
      }
      this.currentEdit = obj
      // if (process.env.DEV) console.log('RECORD: ' + JSON.stringify(obj, null, 2))
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
      const stoRef = storageRef(storage, obj.filename)
      const thumbRef = storageRef(storage, thumbName(obj.filename))

      try {
        await Promise.all([deleteDoc(docRef), deleteObject(stoRef), deleteObject(thumbRef)])
      } catch (err) {
        notify({
          type: 'error',
          group: obj.filename,
          message: `${obj.filename} ${String(err)}`,
        })
      }

      if (obj.thumb) {
        removeFromList(this.objects, obj)

        const meta = useValuesStore()
        this.bucketDiff(-obj.size)
        meta.updateCounters(obj, null)
        if (obj.date === this.lastRecord?.date) {
          this.getLast()
        }
      } else {
        removeFromList(this.uploaded, obj)
      }
      notify({
        message: `${obj.filename} deleted`,
      })
    },

    /**
     * Retrieves the most recent photo from the Firestore database.
     *
     * @return {Promise<PhotoType | null>} A promise that resolves to the last photo
     * taken, or null if no photos are found.
     */
    async getLast(): Promise<PhotoType | null> {
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
     * Retrieves the most recent messages from the Firestore database.
     *
     * @return {Promise<MessageType[]>} A promise that resolves to an array of the most recent messages.
     */
    async fetchMessages(): Promise<MessageType[]> {
      const messages: MessageType[] = []
      const q = query(messageCollection, orderBy('timestamp', 'desc'), limit(50))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          messages.push({ ...(d.data() as MessageType), key: d.id })
        })
      }
      return messages
    },

    /**
     * Deletes messages from the Firestore database.
     *
     * @param {string[]} keys - An array of message keys to delete.
     * @return {Promise<void>} A promise that resolves when the messages are deleted.
     */
    async deleteMessages(keys: string[]): Promise<void> {
      const batch = writeBatch(db)
      keys.forEach((key) => {
        const docRef = doc(messageCollection, key)
        batch.delete(docRef)
      })
      await batch.commit()
      notify({ message: `Deleted ${keys.length} messages` })
    },

    /**
     * Sets the application theme and persists it to local storage.
     * @param theme The theme to set ('light', 'dark', or 'auto').
     */
    setTheme(theme: 'light' | 'dark' | 'auto') {
      this.theme = theme
      LocalStorage.set('theme', theme)
      Dark.set(theme === 'auto' ? 'auto' : theme === 'dark')
    },

    /**
     * Initializes the theme from local storage.
     */
    initTheme() {
      Dark.set(this.theme === 'auto' ? 'auto' : this.theme === 'dark')
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
