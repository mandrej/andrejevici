import type { StateCreator } from 'zustand'
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { ProgressThrottle, UploadTracker } from '@/helpers/uploadTracker'
import { TransferCancelledError, TransferFailedError, isCancelled } from '@/stores/transfer/errors'
import { startUpload } from '@/stores/transfer/upload'
import type {
  StartUpload,
  TransferEntry,
  TransferHandle,
  TransferKind,
  TransferPatch,
  TransferStatus,
  TransferStore,
  TransferSliceState,
  TransferSliceActions,
} from '@/stores/transfer/types'

/** How long a finished row stays in the strip, so the full bar is visible before it goes. */
const COMPLETED_GRACE_MS = 500

const isTerminalStatus = (status: TransferStatus): boolean =>
  status === 'completed' || status === 'error' || status === 'cancelled'

/** Per-store non-reactive bookkeeping: live trackers, throttles, and deferred removals. */
interface Registry {
  entries: Map<string, TransferEntry>
  timers: Set<ReturnType<typeof setTimeout>>
}

const buildSlice =
  (
    registry: Registry,
    upload: StartUpload,
  ): StateCreator<TransferStore, [], [], TransferSliceState & TransferSliceActions> =>
  (set, get) => {
    /**
     * One throttle serves every transfer, so a full queue costs one store write per interval
     * rather than one per file per frame. It is backed by `setTimeout`, which keeps ticking in a
     * background tab where `requestAnimationFrame` would not.
     */
    const throttle = new ProgressThrottle({
      flush: (batch) => {
        get().patchTransfers(
          batch.map(
            (sample): TransferPatch => ({
              id: sample.id,
              progress: sample.progress,
              bytesTransferred: sample.bytes,
            }),
          ),
        )
      },
    })

    /** Keeps a finished row visible briefly, then drops it. */
    const removeSoon = (id: string) => {
      const timer = setTimeout(() => {
        registry.timers.delete(timer)
        get().removeTransfer(id)
      }, COMPLETED_GRACE_MS)
      registry.timers.add(timer)
    }

    /** Terminal cleanup shared by every path: registry, throttle, and row move together. */
    const finalize = (id: string, status: TransferStatus, error: string | null) => {
      registry.entries.delete(id)
      throttle.drop(id)
      get().setStatus(id, status, error)
      if (status === 'completed') removeSoon(id)
    }

    /**
     * Aborts in-flight bytes and settles the caller's promise. Marks the tracker cancelled
     * *before* the SDK is told to cancel, because cancelling makes it raise a `storage/canceled`
     * error and the state machine must already be terminal when that lands.
     */
    const abort = (id: string, entry: TransferEntry) => {
      entry.tracker.cancel()
      registry.entries.delete(id)
      throttle.drop(id)
      get().setStatus(id, 'cancelled')
      entry.cancel()
    }

    return {
      transfers: [],

      register: (transfer) => set((state) => ({ transfers: [...state.transfers, transfer] })),

      /**
       * Applies a batch of progress updates in one write. Untouched rows keep their identity, and
       * unknown ids are skipped — a late report must not resurrect a row that already left.
       */
      patchTransfers: (patches) =>
        set((state) => {
          if (patches.length === 0) return state
          const byId = new Map(patches.map((patch) => [patch.id, patch]))
          let changed = false
          const transfers = state.transfers.map((transfer) => {
            const patch = byId.get(transfer.id)
            if (!patch || transfer.status !== 'uploading') return transfer
            changed = true
            return {
              ...transfer,
              progress: patch.progress,
              bytesTransferred: patch.bytesTransferred,
            }
          })
          return changed ? { transfers } : state
        }),

      setStatus: (id, status, error = null) =>
        set((state) => ({
          transfers: state.transfers.map((transfer) =>
            // Never re-mark a row that already ended: the `storage/canceled` error the SDK raises
            // because we called cancel() must not turn a cancellation into a failure.
            transfer.id === id && !isTerminalStatus(transfer.status)
              ? { ...transfer, status, error, ...(status === 'completed' ? { progress: 1 } : {}) }
              : transfer,
          ),
        })),

      removeTransfer: (id) =>
        set((state) => ({ transfers: state.transfers.filter((transfer) => transfer.id !== id) })),

      clearFinished: () =>
        set((state) => ({
          transfers: state.transfers.filter((transfer) => !isTerminalStatus(transfer.status)),
        })),

      startTransfer: (file, kind: TransferKind): TransferHandle => {
        const id = `${uuidv4().substring(0, 8)}_${file.name}`
        const tracker = new UploadTracker(id)

        // Registered as `uploading` rather than `pending`: the byte transfer starts synchronously
        // below, so no observer can ever see the row before bytes are moving, and `patchTransfers`
        // only applies to `uploading` rows.
        get().register({
          id,
          kind,
          label: file.name,
          status: 'uploading',
          progress: 0,
          bytesTransferred: 0,
          totalBytes: file.size,
          error: null,
          startedAt: Date.now(),
        })

        // The tracker must be live *before* `upload()` runs, since it reads `uploading` to decide
        // whether a progress report counts. The handle is wired through a closure so the tracker
        // still owns cancellation, without the assignment having to wait for the task.
        let task: ReturnType<StartUpload> | null = null
        tracker.start({ cancel: () => task?.cancel() })

        task = upload(id, file, (bytes, total) => {
          // The tracker owns the state machine, so a late event after a cancel is ignored here
          // rather than resurrecting a discarded row.
          tracker.updateProgress(bytes, total)
          if (tracker.status !== 'uploading') return
          throttle.report({
            id,
            bytes: tracker.bytesTransferred,
            total: tracker.totalBytes,
            progress: tracker.progress,
          })
        })

        const { promise, resolve, reject } = Promise.withResolvers<string>()
        let settled = false

        /** Settles the caller's promise as cancelled, once. */
        const settleCancelled = () => {
          if (settled) return
          settled = true
          reject(new TransferCancelledError(id))
        }

        const entry: TransferEntry = { tracker, kind, cancel: settleCancelled }
        registry.entries.set(id, entry)

        /** Terminal failure path, shared by every rejection source. */
        const fail = (err: unknown) => {
          if (settled) return
          const error = err instanceof Error ? err : new Error(String(err))
          tracker.fail(error)

          // A cancellation is not a failure: report it as such so callers requeue quietly rather
          // than telling the user something went wrong that they asked for.
          if (isCancelled(error)) {
            settleCancelled()
            finalize(id, 'cancelled', null)
            return
          }
          settled = true
          const message = error.message || 'Upload failed'
          finalize(id, 'error', message)
          reject(new TransferFailedError(id, message))
        }

        task.promise.then((downloadURL) => {
          if (settled) return
          tracker.finish(downloadURL)
          // Report the finished byte count before flushing, so the bar reaches full even if the
          // SDK's last progress event landed short of the total.
          throttle.report({
            id,
            bytes: tracker.bytesTransferred,
            total: tracker.totalBytes,
            progress: tracker.progress,
          })
          throttle.flushNow()
          // The bytes are up. A plain upload is done here; a swap holds the same row open
          // through its record rewrite and calls `succeed()` when that finishes.
          if (kind === 'upload') {
            settled = true
            finalize(id, 'completed', null)
          }
          resolve(downloadURL)
        }, fail)

        return {
          id,
          promise,
          succeed: () => {
            if (settled) return
            settled = true
            tracker.finish(tracker.downloadURL ?? '')
            throttle.flushNow()
            finalize(id, 'completed', null)
          },
          fail,
          // `abort` cancels the underlying task through the tracker and settles the promise.
          cancel: () => abort(id, entry),
        }
      },

      cancelTransfer: (id) => {
        const entry = registry.entries.get(id)
        if (entry) abort(id, entry)
      },

      cancelAll: (kind?: TransferKind) => {
        // Snapshot the entries first: `abort` deletes from the map as it goes.
        for (const [id, entry] of [...registry.entries]) {
          if (kind === undefined || entry.kind === kind) abort(id, entry)
        }
      },
    }
  }

/** Builds an isolated store with its own registry and a swappable uploader. Exported for tests. */
export const createTransferStore = (upload: StartUpload = startUpload) =>
  create<TransferStore>()((...a) =>
    buildSlice({ entries: new Map(), timers: new Set() }, upload)(...a),
  )
