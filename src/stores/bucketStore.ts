import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createBucketSlice } from '@/stores/bucket/createBucketSlice'
import type { BucketStore } from '@/stores/bucket/types'

export type { BucketStore }

export const useBucketStore = create<BucketStore>()(
  persist(
    (...a) => ({
      ...createBucketSlice(...a),
    }),
    {
      name: 'bucket-storage',
    },
  ),
)
