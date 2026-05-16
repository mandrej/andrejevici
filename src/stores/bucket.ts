import { defineStore, acceptHMRUpdate } from 'pinia'
import { doc, getDoc, getDocs, setDoc, query, orderBy } from 'firebase/firestore'
import { bucketCollection, photoCollection } from '../helpers/collections'
import notify from '../helpers/notify'
import type { BucketType } from '../helpers/models'

const bucketRef = doc(bucketCollection, 'total')

export const useBucketStore = defineStore('bucket', {
  state: () => ({
    bucket: { size: 0, count: 0 } as BucketType,
  }),
  persist: true,
  actions: {
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

    async bucketBuild(): Promise<void> {
      const querySnapshot = await getDocs(query(photoCollection, orderBy('date', 'desc')))
      let count = 0
      let size = 0
      querySnapshot.forEach((d) => {
        count++
        size += d.data().size
      })
      this.bucket = { count, size }
      setDoc(bucketRef, this.bucket, { merge: true })
      notify({ type: 'positive', message: `Bucket size calculated`, icon: 'sym_r_check' })
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useBucketStore, import.meta.hot))
}
