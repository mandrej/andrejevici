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
  removeByProperty,
  changedByProperty,
  textSlug,
  sliceSlug,
} from '../helpers'
import notify from '../helpers/notify'
import { useValuesStore } from './values'
import type {
  QuerySnapshot,
  DocumentSnapshot,
  DocumentData,
  Query,
  QueryConstraint,
  QueryFieldFilterConstraint,
  QueryDocumentSnapshot,
} from '@firebase/firestore'
import type { Find, Bucket, UploadedItem, StoredItem, LastRecord } from '../components/models'

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
    uploaded: [] as UploadedItem[],
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
        this.bucket = docSnap.data()
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
    },
    async fetchRecords(reset = false, invoked = '') {
      if (this.busy) {
        if (process.env.DEV) console.log('SKIPPED FOR ' + invoked)
        return
      }
      let max = CONFIG.limit
      let serachTags = null,
        serachText = null

      const filters: QueryFieldFilterConstraint[] = Object.entries(this.find as Find).map(
        ([key, val]) => {
          if (key === 'tags') {
            serachTags = val as string[]
            max *= serachTags.length
            return where(key, 'array-contains-any', val)
          } else if (key === 'text') {
            const slug = textSlug(val as string)
            const arr = sliceSlug(slug)
            serachText = arr
            max *= arr.length
            return where(key, 'array-contains-any', arr)
          } else {
            return where(key, '==', val)
          }
        },
      )
      const constraints: Array<QueryConstraint> = [...filters, orderBy('date', 'desc')]
      if (reset) this.next = null
      if (this.next) {
        const cursor = await getDoc(doc(db, 'Photo', this.next))
        constraints.push(startAfter(cursor))
      }
      constraints.push(limit(max))
      const q = query(photosCol, ...constraints)

      this.busy = true
      try {
        const querySnapshot: QuerySnapshot = await getDocs(q)
        if (reset) this.objects.length = 0
        querySnapshot.forEach((d: QueryDocumentSnapshot) => {
          this.objects.push(d.data() as StoredItem)
        })
        const next = querySnapshot.docs[querySnapshot.docs.length - 1]
        if (next && next.id) {
          next.id === this.next ? (this.next = null) : (this.next = next.id)
        } else {
          this.next = null
        }
      } catch (err) {
        this.error = (err as Error).message
        this.busy = false
        return {
          objects: [] as StoredItem[],
          error: (err as Error).message,
          next: null,
        }
      }

      // filter by tags
      if (serachTags) {
        this.objects = this.objects.filter((d) =>
          includeSub(d.tags as string[], serachTags as string[]),
        )
      }
      // filter by text
      if (serachText) {
        this.objects = this.objects.filter((d) =>
          includeSub(d.text as string[], serachText as string[]),
        )
      }

      this.error = this.objects.length === 0 ? 'empty' : null
      this.busy = false
      if (process.env.DEV)
        console.log('FETCHED FOR ' + invoked + ' ' + JSON.stringify(this.find, null, 2))
    },
    async saveRecord(obj) {
      const docRef = doc(db, 'Photo', obj.filename)
      const meta = useValuesStore()
      if (obj.thumb) {
        const oldDoc = await getDoc(docRef)
        meta.decreaseValues(oldDoc.data() as StoredItem)
        await setDoc(docRef, obj, { merge: true })

        changedByProperty(this.objects, 'filename', obj)
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
        changedByProperty(this.objects, 'filename', obj, 0)
        notify({ message: `${obj.filename} published` })
        // delete uploaded
        removeByProperty(this.uploaded, 'filename', obj.filename)

        this.bucketDiff(obj.size)
        meta.increaseValues(obj)
      }
    },
    async deleteRecord(obj) {
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

        removeByProperty(this.objects, 'filename', obj.filename)
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
          removeByProperty(this.uploaded, 'filename', obj.filename)
        }
        notify({
          group: `${obj.filename}`,
          message: `${obj.filename} deleted`,
        })
      }
    },
    async getLast(): Promise<LastRecord | null> {
      let q, querySnapshot, rec
      const constraints = [orderBy('date', 'desc'), limit(1)]
      q = query(photosCol, ...constraints)
      querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        rec = getRec(querySnapshot) as LastRecord
        const obj = { year: rec.year, month: rec.month }
        rec.href = '/list?' + new URLSearchParams(obj).toString()
      } else {
        return null
      }

      // if (auth.user && auth.user.isAuthorized) {
      //   q = query(
      //     photosCol,
      //     where("email", "==", auth.user.email),
      //     ...constraints
      //   );
      //   querySnapshot = await getDocs(q);
      //   if (!querySnapshot.empty) {
      //     rec = getRec(querySnapshot);
      //     const diff = Date.parse(rec.date) - +new Date();
      //     if (diff < CONFIG.activeUser) {
      //       rec.href = "/list?nick=" + emailNick(rec.email);
      //     }
      //   }
      // }
      this.lastRecord = rec
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
