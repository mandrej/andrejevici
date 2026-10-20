import type { UploadStatus, UploadTracker } from '@/helpers/uploadTracker'

/** What the bytes are for: a new queue upload, or replacing an existing image. */
export type TransferKind = 'upload' | 'swap'

/** Reuses the tracker's union so the two cannot drift apart. */
export type TransferStatus = UploadStatus

export interface Transfer {
  /** Storage object name (`uuid8_original-name`); also the record id. */
  id: string
  kind: TransferKind
  /** Original file name, shown in the segment's title. */
  label: string
  status: TransferStatus
  /** 0..1. */
  progress: number
  bytesTransferred: number
  totalBytes: number
  error: string | null
  startedAt: number
}

/** A progress update produced by the shared throttle and applied in one batch. */
export interface TransferPatch {
  id: string
  progress: number
  bytesTransferred: number
}

/** What `startTransfer` hands back: the promise plus explicit control over its terminal state. */
export interface TransferHandle {
  id: string
  /** Resolves with the public download URL once the bytes have landed. */
  promise: Promise<string>
  /** Marks the row completed. A swap calls this once its record rewrite finishes. */
  succeed: () => void
  /** Marks the row failed. */
  fail: (err: unknown) => void
  /** Aborts the transfer. No-op once it has settled. */
  cancel: () => void
}

/** Non-reactive bookkeeping for one in-flight transfer, kept out of the store's React state. */
export interface TransferEntry {
  tracker: UploadTracker
  kind: TransferKind
  /**
   * Settles the handle's promise as cancelled. Owned by the entry, not the returned handle, so
   * `cancelTransfer`/`cancelAll` — which only ever have the entry — settle it too. Without that, a
   * caller awaiting `Promise.allSettled` on a cancelled queue would wait forever.
   */
  cancel: () => void
}

/**
 * Starts the byte transfer. Injected so the store can be exercised in tests with no Firebase.
 * `onProgress` receives transferred and total bytes; the promise yields the download URL.
 */
export type StartUpload = (
  name: string,
  file: File,
  onProgress: (bytes: number, total: number) => void,
) => {
  promise: Promise<string>
  cancel: () => void
}

export interface TransferSliceState {
  /** Registration order, which is the order the header strip renders. */
  transfers: Transfer[]
}

export interface TransferSliceActions {
  register: (transfer: Transfer) => void
  /** Applies a batch of progress updates in a single store write. */
  patchTransfers: (patches: TransferPatch[]) => void
  setStatus: (id: string, status: TransferStatus, error?: string | null) => void
  removeTransfer: (id: string) => void
  /** Drops every terminal row, so the strip empties once work has settled. */
  clearFinished: () => void

  startTransfer: (file: File, kind: TransferKind) => TransferHandle
  cancelTransfer: (id: string) => void
  /**
   * Aborts every live transfer, or only those of one `kind` when one is given. Scoping matters
   * because the strip is global: a swap started on `/list` stays visible after navigating to
   * `/add`, and that page's "Cancel all" has no business killing it.
   */
  cancelAll: (kind?: TransferKind) => void
}

export type TransferStore = TransferSliceState & TransferSliceActions
