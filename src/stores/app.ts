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
import type { FindType, BucketType, PhotoType, LastPhoto } from '../helpers/models'

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
    } as BucketType,

    find: {} as FindType | null,
    uploaded: [] as PhotoType[],
    objects: [] as PhotoType[],
    next: null as string | null,
    currentEdit: {} as PhotoType,
    lastRecord: {} as PhotoType | null,

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
        this.bucket = docSnap.data() as BucketType
      } else {
        console.error('Failed to read bucket data')
      }
    },
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
          this.objects.push(d.data() as PhotoType)
        })
        const next = querySnapshot.docs[querySnapshot.docs.length - 1]
        this.next = next && next.id !== this.next ? next.id : null
      } catch (err) {
        this.error = (err as Error).message
        this.busy = false
        return { objects: [] as PhotoType[], error: (err as Error).message, next: null }
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
      if (process.env.DEV) console.log('FETCH ' + JSON.stringify(this.find, null, 2))
    },
    async saveRecord(obj: PhotoType) {
      const docRef = doc(db, 'Photo', obj.filename)
      const meta = useValuesStore()
      if (!obj.unbound) {
        const oldDoc = await getDoc(docRef)
        meta.decreaseValues(oldDoc.data() as PhotoType)
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
        delete obj.unbound
        await setDoc(docRef, obj, { merge: true })
        changeByFilename(this.objects, obj, 0)
        this.getLast()
        notify({ message: `${obj.filename} published` })
        // delete uploaded
        removeByFilename(this.uploaded, obj.filename)

        this.bucketDiff(obj.size)
        meta.increaseValues(obj)
      }
      this.currentEdit = obj as PhotoType
      // if (process.env.DEV) console.log('RECORD: ' + JSON.stringify(obj, null, 2))
      return obj
    },
    async deleteRecord(obj: PhotoType) {
      notify({
        group: `${obj.filename}`,
        message: `Please wait`,
      })
      const docRef = doc(db, 'Photo', obj.filename)
      const stoRef = storageRef(storage, obj.filename)
      const thumbRef = storageRef(storage, thumbName(obj.filename))

      const docSnap = await getDoc(docRef)
      const data = docSnap.data() as PhotoType

      try {
        await deleteDoc(docRef)
        await deleteObject(stoRef)
        await deleteObject(thumbRef)
      } catch (err) {
        if (process.env.DEV) console.log('DELETE ERROR ' + err)
      }

      if (obj.unbound) {
        removeByFilename(this.uploaded, obj.filename)
        notify({
          group: `${obj.filename}`,
          message: `${obj.filename} deleted`,
        })
      } else {
        removeByFilename(this.objects, obj.filename)

        const meta = useValuesStore()
        this.bucketDiff(-data.size)
        meta.decreaseValues(data)
        this.getLast()

        notify({
          group: `${obj.filename}`,
          message: `${obj.filename} deleted`,
        })
      }
    },
    async getLast(): Promise<LastPhoto | null> {
      try {
        const querySnapshot = await getDocs(query(photosCol, orderBy('date', 'desc'), limit(1)))
        const rec = getRec(querySnapshot) as LastPhoto
        if (rec) {
          // Set the href property to the URL of the last month it was taken
          rec.href = '/list?' + new URLSearchParams({ year: '' + rec.year, month: '' + rec.month })
        }
        this.lastRecord = rec
        return rec as LastPhoto
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
