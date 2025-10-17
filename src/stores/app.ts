import { defineStore, acceptHMRUpdate } from 'pinia'
import { db, storage } from '../boot/fire'
import {
  doc,
  collection,
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
  CONFIG,
  thumbName,
  thumbUrl,
  removeByFilename,
  changeByFilename,
  textSlug,
  sliceSlug,
} from '../helpers'
import notify from '../helpers/notify'
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
} from '../helpers/models'

const bucketRef = doc(db, 'Bucket', 'total')
const photosCol = collection(db, 'Photo')

/**
 * Retrieves the data from the first document in the given snapshot.
 *
 * @param {Object} snapshot - The snapshot containing the documents.
 * @return {Object|null} The data from the first document, or null if the snapshot is empty.
 */
const getRec = (snapshot: QuerySnapshot<DocumentData>) =>
  snapshot.docs.length ? snapshot.docs[0]?.data() : null

const includeSub = <T>(arr: T[], target: T[]): boolean => target.every((v) => arr.includes(v))

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
    // bucket
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
    /**
     * Builds and updates the bucket object with the count and size of all photos.
     *
     * @returns {Promise<BucketType>} A promise that resolves to the updated bucket object.
     */
    async bucketBuild(): Promise<BucketType> {
      const res = {
        count: 0,
        size: 0,
      }
      const q = query(photosCol, orderBy('date', 'desc'))
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
        (this.find?.text ? sliceSlug(textSlug(this.find.text)).length : 1)
      const filters: QueryFieldFilterConstraint[] = Object.entries(this.find || {}).map(
        ([key, val]) => {
          if (key === 'tags') {
            return where(key, 'array-contains-any', val)
          } else if (key === 'text') {
            return where(key, 'array-contains-any', sliceSlug(textSlug(val as string)))
          } else {
            return where(key, '==', val)
          }
        },
      )

      const constraints: Array<QueryConstraint> = [...filters, orderBy('date', 'desc')]
      if (reset) this.next = ''
      if (this.next != '') {
        const cursor: DocumentSnapshot = await getDoc(doc(db, 'Photo', this.next))
        constraints.push(startAfter(cursor))
      }
      constraints.push(limit(max))

      this.busy = true
      try {
        const querySnapshot: QuerySnapshot = await getDocs(query(photosCol, ...constraints))
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
          includeSub(d.text as string[], sliceSlug(textSlug(this.find?.text || ''))),
        )
      }

      this.error = this.objects.length === 0 ? 'empty' : ''
      this.busy = false
      if (process.env.DEV) console.log('FETCH ' + JSON.stringify(this.find, null, 2))
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
      const docRef = doc(db, 'Photo', obj.filename)
      const meta = useValuesStore()
      if (obj.thumb) {
        const oldDoc = await getDoc(docRef)
        await setDoc(docRef, obj, { merge: true })
        changeByFilename(this.objects, obj)

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
        changeByFilename(this.objects, obj, 0)
        await this.getLast()
        await this.bucketDiff(obj.size)
        meta.updateCounters(null, obj)
        // delete uploaded
        removeByFilename(this.uploaded, obj.filename)
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
      const docRef = doc(db, 'Photo', obj.filename)
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
        removeByFilename(this.objects, obj.filename)

        const meta = useValuesStore()
        await this.bucketDiff(-data.size)
        meta.updateCounters(data, null)
        await this.getLast()
      } else {
        removeByFilename(this.uploaded, obj.filename)
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
        const querySnapshot = await getDocs(query(photosCol, orderBy('date', 'desc'), limit(1)))
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
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
