import type { BucketType } from '../../helpers/models'

export interface BucketSliceState {
  bucket: BucketType
}

export interface BucketSliceActions {
  fetchBucket: () => Promise<void>
  bucketDiff: (num: number) => void
  bucketBuild: () => Promise<void>
}

export type BucketStore = BucketSliceState & BucketSliceActions
