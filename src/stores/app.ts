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
import type { Find, Bucket, StoredItem, LastRecord } from '../components/models'

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
  state: () => ({
    bucket: {
      size: 0,
      count: 0,
    } as Bucket,

    find: {} as Find | null,
    uploaded: [] as StoredItem[],
    objects: [] as StoredItem[],
    next: null as string | null,
    currentEdit: {} as StoredItem,
    lastRecord: {} as StoredItem | null,
    sinceYear: '',

    busy: false,
    error: null as string | null,
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
        this.bucket = docSnap.data() as Bucket
      } else {
        console.error('Failed to read bucket data')
      }
    },
    async bucketDiff(num: number): Promise<Bucket> {
      if (num > 0) {
        this.bucket.size += num
        this.bucket.count++
      } else {
        this.bucket.size -= num
        this.bucket.count--
      }
      if (this.bucket.count <= 0) {
        this.bucket.size = 0
        this.bucket.count = 0
      }
      await setDoc(bucketRef, this.bucket, { merge: true })
      return this.bucket
    },
    async bucketBuild(): Promise<Bucket> {
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
    async fetchRecords(reset = false, invoked = '') {
      if (this.busy) {
        if (process.env.DEV) console.log('SKIPPED FOR ' + invoked)
        return
      }

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
      if (reset) this.next = null
      if (this.next) {
        const cursor: DocumentSnapshot = await getDoc(doc(db, 'Photo', this.next))
        constraints.push(startAfter(cursor))
      }
      constraints.push(limit(max))

      this.busy = true
      try {
        const querySnapshot: QuerySnapshot = await getDocs(query(photosCol, ...constraints))
        if (reset) this.objects.length = 0
        querySnapshot.forEach((d: QueryDocumentSnapshot) => {
          this.objects.push(d.data() as StoredItem)
        })
        const next = querySnapshot.docs[querySnapshot.docs.length - 1]
        this.next = next && next.id !== this.next ? next.id : null
      } catch (err) {
        this.error = (err as Error).message
        this.busy = false
        return { objects: [] as StoredItem[], error: (err as Error).message, next: null }
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

      this.error = this.objects.length === 0 ? 'empty' : null
      this.busy = false
      if (process.env.DEV)
        console.log('FETCHED FOR ' + invoked + ' ' + JSON.stringify(this.find, null, 2))
    },
    async saveRecord(obj: StoredItem) {
      const docRef = doc(db, 'Photo', obj.filename)
      const meta = useValuesStore()
      if (obj.thumb) {
        const oldDoc = await getDoc(docRef)
        meta.decreaseValues(oldDoc.data() as StoredItem)
        await setDoc(docRef, obj, { merge: true })

        changeByFilename(this.objects, obj)
        notify({ message: `${obj.filename} updated` })
        meta.increaseValues(obj)
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
        notify({ message: `${obj.filename} published` })
        // delete uploaded
        removeByFilename(this.uploaded, obj.filename)

        this.bucketDiff(obj.size)
        meta.increaseValues(obj)
      }
    },
    async deleteRecord(obj: StoredItem) {
      notify({
        group: `${obj.filename}`,
        message: `Please wait`,
      })
      if (obj.thumb) {
        const docRef = doc(db, 'Photo', obj.filename)
        const docSnap = await getDoc(docRef)
        const data = docSnap.data() as StoredItem
        const stoRef = storageRef(storage, obj.filename)
        const thumbRef = storageRef(storage, thumbName(obj.filename))
        await deleteDoc(docRef)
        await deleteObject(stoRef)
        await deleteObject(thumbRef)

        removeByFilename(this.objects, obj.filename)
        const meta = useValuesStore()
        this.bucketDiff(-data.size)
        meta.decreaseValues(data)
        notify({
          group: `${obj.filename}`,
          message: `${obj.filename} deleted`,
        })
      } else {
        const stoRef = storageRef(storage, obj.filename)
        const thumbRef = storageRef(storage, thumbName(obj.filename))
        try {
          await deleteObject(stoRef)
          await deleteObject(thumbRef)
        } finally {
          removeByFilename(this.uploaded, obj.filename)
        }
        notify({
          group: `${obj.filename}`,
          message: `${obj.filename} deleted`,
        })
      }
    },
    async getLast(): Promise<LastRecord | null> {
      try {
        const constraints = [orderBy('date', 'desc'), limit(1)]
        const q = query(photosCol, ...constraints)
        const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q)
        const lastRecord = getRec(querySnapshot) as LastRecord
        if (lastRecord) {
          // Set the href property to the URL of the last month it was taken
          lastRecord.href =
            '/list?' +
            new URLSearchParams({ year: '' + lastRecord.year, month: '' + lastRecord.month })
        }
        this.lastRecord = lastRecord
        return lastRecord as LastRecord
      } catch (error) {
        console.error('Failed to get last record:', error)
        return null
      }
    },
    async getSince() {
      const q = query(photosCol, orderBy('date', 'asc'), limit(1))
      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty) return null
      querySnapshot.forEach((d) => {
        const obj = d.data()
        this.sinceYear = obj.year
      })
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAppStore, import.meta.hot))
}
