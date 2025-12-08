import { defineStore, acceptHMRUpdate } from 'pinia'
import { storage } from 'src/boot/firebase'
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
import { CONFIG, thumbName, thumbUrl, removeFromList, replaceInList, sliceSlug } from 'src/helpers'
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
  LastPhoto,
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
    lastRecord: {} as PhotoType | null,
    busy: false,
    progressInfo: {} as FileProgress,
    error: '',
    showEdit: false,
    showConfirm: false,
    showCarousel: false,
    editMode: false,
    adminTab: 'repair',
  }),
  getters: {
    record: (state) => {
      return {
        count: state.objects.length,
      }
    },
  },
  actions: {
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
    /**
     * Updates the bucket size and count by a given number.
     *
     * @param {number} num - The number to update the bucket size and count by. If positive, the size is increased and the count is incremented. If negative, the size is decreased and the count is decremented.
     * @returns {Promise<BucketType>} A promise that resolves to the updated bucket object.
     */
    async bucketDiff(num: number): Promise<BucketType> {
      if (num > 0) {
        this.bucket.size += num
        this.bucket.count++
      } else {
        this.bucket.size += num
        this.bucket.count--
      }
      if (this.bucket.count <= 0) {
        this.bucket.size = 0
        this.bucket.count = 0
      }
      await setDoc(bucketRef, this.bucket, { merge: true })
      return this.bucket
    },

    async bucketBuild(): Promise<BucketType> {
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
      await setDoc(bucketRef, this.bucket, { merge: true })
      notify({ message: `Bucket size calculated` })
      return this.bucket
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
        querySnapshot.forEach((d: QueryDocumentSnapshot) => {
          this.objects.push(d.data() as PhotoType)
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
        const oldDoc = await getDoc(docRef)
        await setDoc(docRef, obj, { merge: true })
        replaceInList(this.objects, obj)

        meta.updateCounters(oldDoc.data() as PhotoType, obj)
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
        await this.getLast()
        await this.bucketDiff(obj.size)
        meta.updateCounters(null, obj)
        // delete uploaded
        removeFromList(this.uploaded, obj)
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
      const docSnap = await getDoc(docRef)
      const data = docSnap.data() as PhotoType
      const stoRef = storageRef(storage, obj.filename)
      const thumbRef = storageRef(storage, thumbName(obj.filename))

      try {
        await deleteDoc(docRef)
        await deleteObject(stoRef)
        await deleteObject(thumbRef)
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
        await this.bucketDiff(-data.size)
        meta.updateCounters(data, null)
        await this.getLast()
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
     * @return {Promise<LastPhoto | null>} A promise that resolves to the last photo
     * taken, or null if no photos are found. The href property of the returned photo
     * is set to the URL of the last month it was taken.
     */
    async getLast(): Promise<LastPhoto | null> {
      try {
        const querySnapshot = await getDocs(
          query(photoCollection, orderBy('date', 'desc'), limit(1)),
        )
        const rec = getRec(querySnapshot) as LastPhoto
        if (rec) {
          // Set the href property to the URL of the last month it was taken
          rec.href =
            '/list?' +
            new URLSearchParams({ year: String(rec.year), month: String(rec.month) }).toString()
        }
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
      const deletePromises = keys.map(async (key) => {
        const docRef = doc(messageCollection, key)
        await deleteDoc(docRef)
      })
      await Promise.all(deletePromises)
      notify({ message: `Deleted ${keys.length} messages` })
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
