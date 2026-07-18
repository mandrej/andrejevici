import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { doc, getDoc, getDocs, setDoc, query, orderBy } from 'firebase/firestore'
import { bucketCollection, photoCollection } from '../helpers/collections'
import notify from '../helpers/notify'
import type { BucketType } from '../helpers/models'

interface BucketStore {
  bucket: BucketType
  fetchBucket: () => Promise<void>
  bucketDiff: (num: number) => void
  bucketBuild: () => Promise<void>
}

const bucketRef = doc(bucketCollection, 'total')

export const useBucketStore = create<BucketStore>()(
  persist(
    (set) => ({
      bucket: { size: 0, count: 0 },

      fetchBucket: async () => {
        const docSnap = await getDoc(bucketRef)
        if (docSnap.exists()) {
          set({ bucket: docSnap.data() as BucketType })
        } else {
          console.error('Failed to read bucket data')
        }
      },

      bucketDiff: (num: number) => {
        set((state) => {
          const size = state.bucket.size + num
          const count = state.bucket.count + (num > 0 ? 1 : -1)

          const updated = {
            size: count <= 0 ? 0 : size,
            count: count <= 0 ? 0 : count,
          }

          setDoc(bucketRef, updated, { merge: true })

          if (process.env.NODE_ENV === 'development') {
            console.log('BUCKET: ' + JSON.stringify(updated, null, 2))
          }

          return { bucket: updated }
        })
      },

      bucketBuild: async () => {
        const querySnapshot = await getDocs(query(photoCollection, orderBy('date', 'desc')))
        let count = 0
        let size = 0
        querySnapshot.forEach((d) => {
          count++
          size += d.data().size
        })

        const updated = { count, size }
        set({ bucket: updated })
        await setDoc(bucketRef, updated, { merge: true })
        notify({ type: 'positive', message: 'Bucket size calculated', icon: 'sym_r_check' })
      },
    }),
    {
      name: 'bucket-storage',
    },
  ),
)
