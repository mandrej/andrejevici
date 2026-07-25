import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createBucketSlice } from './bucket/createBucketSlice'
import type { BucketStore } from './bucket/types'

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
