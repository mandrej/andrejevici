import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { createTransferStore } from '@/stores/transfer/createTransferSlice'
import { TransferCancelledError, TransferFailedError, isCancelled } from '@/stores/transfer/errors'
import type { StartUpload, TransferKind, TransferStore } from '@/stores/transfer/types'

const file = (name: string, size = 1000): File =>
  new File([new Uint8Array(size)], name, { type: 'image/jpeg' })

/**
 * A controllable stand-in for the Storage SDK. Each call parks its callbacks so a test can drive
 * progress, completion, failure, and cancellation by hand.
 */
const fakeUploader = () => {
  const calls: Array<{
    name: string
    file: File
    progress: (bytes: number, total: number) => void
    resolve: (url: string) => void
    reject: (err: unknown) => void
    cancels: number
  }> = []

  const upload: StartUpload = (name, f, onProgress) => {
    const { promise, resolve, reject } = Promise.withResolvers<string>()
    const call = {
      name,
      file: f,
      progress: onProgress,
      resolve,
      reject,
      cancels: 0,
    }
    calls.push(call)
    return {
      promise,
      cancel: () => {
        call.cancels++
        // What the real SDK does: cancelling surfaces as a `storage/canceled` error event.
        reject(Object.assign(new Error('storage/canceled'), { code: 'storage/canceled' }))
      },
    }
  }

  return { upload, calls }
}

/** Lets the promise callbacks queued by a resolve/reject run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * A live view of one fresh store. Reads go through `getState()` on every access, because zustand
 * replaces the state object on each write and a snapshot taken once would go stale immediately.
 */
const setup = (): { store: TransferStore; calls: ReturnType<typeof fakeUploader>['calls'] } => {
  const { upload, calls } = fakeUploader()
  const api = createTransferStore(upload)
  const store = new Proxy({} as TransferStore, {
    get: (_target, prop) => Reflect.get(api.getState(), prop),
  })
  return { store, calls }
}

describe('transfer store: state actions', () => {
  test('patchTransfers applies a batch in one write and keeps row identity', () => {
    const { store } = setup()
    const row = {
      id: 'a',
      kind: 'upload' as TransferKind,
      label: 'a.jpg',
      status: 'uploading' as const,
      progress: 0,
      bytesTransferred: 0,
      totalBytes: 100,
      error: null,
      startedAt: 0,
    }
    store.register(row)
    const before = store.transfers[0]

    store.patchTransfers([{ id: 'a', progress: 0.5, bytesTransferred: 50 }])

    assert.equal(store.transfers.length, 1)
    assert.equal(store.transfers[0].progress, 0.5)
    assert.notEqual(store.transfers[0], before, 'the row is replaced, not mutated')
    assert.equal(store.transfers[0].label, 'a.jpg', 'untouched fields survive')
  })

  test('patchTransfers ignores an empty batch and unknown ids', () => {
    const { store } = setup()
    store.register({
      id: 'a',
      kind: 'upload',
      label: 'a.jpg',
      status: 'uploading',
      progress: 0,
      bytesTransferred: 0,
      totalBytes: 100,
      error: null,
      startedAt: 0,
    })

    const before = store.transfers
    store.patchTransfers([])
    assert.equal(store.transfers, before, 'an empty batch is a no-op')

    store.patchTransfers([{ id: 'ghost', progress: 1, bytesTransferred: 100 }])
    assert.equal(store.transfers[0].progress, 0, 'a late report cannot resurrect a departed row')
  })

  test('patchTransfers skips rows that are no longer uploading', () => {
    const { store } = setup()
    store.register({
      id: 'a',
      kind: 'upload',
      label: 'a.jpg',
      status: 'completed',
      progress: 1,
      bytesTransferred: 100,
      totalBytes: 100,
      error: null,
      startedAt: 0,
    })

    store.patchTransfers([{ id: 'a', progress: 0.2, bytesTransferred: 20 }])
    assert.equal(store.transfers[0].progress, 1)
  })

  test('setStatus never re-marks a row that already ended', () => {
    const { store } = setup()
    store.register({
      id: 'a',
      kind: 'upload',
      label: 'a.jpg',
      status: 'cancelled',
      progress: 0.4,
      bytesTransferred: 40,
      totalBytes: 100,
      error: null,
      startedAt: 0,
    })

    // What the SDK's `storage/canceled` error would otherwise do.
    store.setStatus('a', 'error', 'storage/canceled')
    assert.equal(store.transfers[0].status, 'cancelled')
    assert.equal(store.transfers[0].error, null)
  })

  test('setStatus to completed pins progress at 100%', () => {
    const { store } = setup()
    store.register({
      id: 'a',
      kind: 'upload',
      label: 'a.jpg',
      status: 'uploading',
      progress: 0.97,
      bytesTransferred: 97,
      totalBytes: 100,
      error: null,
      startedAt: 0,
    })

    store.setStatus('a', 'completed')
    assert.equal(store.transfers[0].progress, 1)
  })

  test('clearFinished drops terminal rows and keeps live ones', () => {
    const { store } = setup()
    const base = {
      kind: 'upload' as TransferKind,
      label: 'x.jpg',
      progress: 0,
      bytesTransferred: 0,
      totalBytes: 100,
      error: null,
      startedAt: 0,
    }
    store.register({ ...base, id: 'live', status: 'uploading' })
    store.register({ ...base, id: 'done', status: 'completed' })
    store.register({ ...base, id: 'bad', status: 'error' })

    store.clearFinished()
    assert.deepEqual(
      store.transfers.map((transfer) => transfer.id),
      ['live'],
    )
  })
})

describe('transfer store: lifecycle', () => {
  test('startTransfer registers the row as uploading under the storage object name', () => {
    const { store, calls } = setup()
    const handle = store.startTransfer(file('photo.jpg'), 'upload')

    assert.equal(calls.length, 1)
    assert.equal(handle.id, calls[0].name, 'the record id is the object name the bytes went to')
    assert.match(handle.id, /^[0-9a-f]{8}_photo\.jpg$/)

    const row = store.transfers[0]
    assert.equal(row.status, 'uploading')
    assert.equal(row.kind, 'upload')
    assert.equal(row.label, 'photo.jpg')
    assert.equal(row.totalBytes, 1000)
  })

  test('progress reaches the store and the promise resolves with the download URL', async () => {
    const { store, calls } = setup()
    const handle = store.startTransfer(file('photo.jpg'), 'upload')

    // The first report is a leading edge, so it is applied without waiting on the throttle.
    calls[0].progress(400, 1000)
    assert.equal(store.transfers[0].bytesTransferred, 400)
    assert.equal(store.transfers[0].progress, 0.4)

    calls[0].resolve('https://example.test/a.jpg')
    assert.equal(await handle.promise, 'https://example.test/a.jpg')
    await settle()

    const row = store.transfers[0]
    assert.equal(row.status, 'completed')
    assert.equal(row.progress, 1)
    assert.equal(row.error, null)
  })

  test('a zero-byte transfer still finishes at 100%', async () => {
    const { store, calls } = setup()
    // The total can legitimately be 0 (an empty File), so the byte fraction must never be
    // recomputed as 0/0 — that would pull a completed bar back down.
    const handle = store.startTransfer(file('empty.jpg', 0), 'upload')

    calls[0].progress(0, 0)
    assert.equal(store.transfers[0].progress, 0)

    calls[0].resolve('https://example.test/empty.jpg')
    await handle.promise
    await settle()

    assert.equal(store.transfers[0].progress, 1)
    assert.equal(store.transfers[0].status, 'completed')
  })

  test('a failed upload reaches the error state and rejects with TransferFailedError', async () => {
    const { store, calls } = setup()
    const handle = store.startTransfer(file('photo.jpg'), 'upload')
    calls[0].progress(300, 1000)

    calls[0].reject(new Error('quota exceeded'))
    await assert.rejects(handle.promise, (err: unknown) => {
      assert.ok(err instanceof TransferFailedError)
      assert.equal(err.message, 'quota exceeded')
      return true
    })

    const row = store.transfers[0]
    assert.equal(row.status, 'error')
    assert.equal(row.error, 'quota exceeded')
    assert.equal(row.progress, 0.3, 'the bar keeps its position rather than jumping to zero')
  })

  test('cancel aborts the task, marks the row, and rejects as cancelled', async () => {
    const { store, calls } = setup()
    const handle = store.startTransfer(file('photo.jpg'), 'upload')

    handle.cancel()
    await assert.rejects(handle.promise, (err: unknown) => {
      assert.ok(err instanceof TransferCancelledError)
      return true
    })
    await settle()

    assert.equal(calls[0].cancels, 1)
    assert.equal(store.transfers[0].status, 'cancelled')
    assert.equal(store.transfers[0].error, null, 'a cancellation is not an error')
  })

  test('the SDK error a cancel provokes does not overwrite the cancellation', async () => {
    const { store, calls } = setup()
    const handle = store.startTransfer(file('photo.jpg'), 'upload')
    // Attached before cancelling: the rejection is produced by the cancel itself.
    const rejection = handle.promise.catch((err: unknown) => err)

    handle.cancel()
    // The rejection the fake uploader raises on cancel is exactly the `storage/canceled` event.
    assert.ok((await rejection) instanceof TransferCancelledError)
    await settle()

    assert.equal(store.transfers[0].status, 'cancelled')
    assert.equal(store.transfers[0].error, null)
    assert.equal(calls[0].cancels, 1)
  })

  test('cancel is a no-op once the transfer has settled', async () => {
    const { store, calls } = setup()
    const handle = store.startTransfer(file('photo.jpg'), 'upload')
    calls[0].resolve('https://example.test/a.jpg')
    await handle.promise
    await settle()

    handle.cancel()
    assert.equal(calls[0].cancels, 0)
    assert.equal(store.transfers[0].status, 'completed')
  })

  test('a late progress event after a cancel is discarded', async () => {
    const { store, calls } = setup()
    const handle = store.startTransfer(file('photo.jpg'), 'upload')
    handle.cancel()
    await handle.promise.catch(() => {})

    calls[0].progress(900, 1000)
    assert.equal(store.transfers[0].progress, 0, 'the cancelled row does not come back to life')
    assert.equal(store.transfers[0].status, 'cancelled')
  })

  test('a swap stays open after the bytes land until succeed() is called', async () => {
    const { store, calls } = setup()
    const handle = store.startTransfer(file('new.jpg'), 'swap')

    calls[0].resolve('https://example.test/new.jpg')
    assert.equal(await handle.promise, 'https://example.test/new.jpg')
    await settle()

    assert.equal(
      store.transfers[0].status,
      'uploading',
      'the row covers the record rewrite too, so it is not finished yet',
    )
    assert.equal(store.transfers[0].progress, 1, 'but the bytes are visibly done')

    handle.succeed()
    assert.equal(store.transfers[0].status, 'completed')
  })

  test('a swap that fails after its bytes landed reports the failure', async () => {
    const { store, calls } = setup()
    const handle = store.startTransfer(file('new.jpg'), 'swap')
    calls[0].resolve('https://example.test/new.jpg')
    await handle.promise

    handle.fail(new Error('record write failed'))
    assert.equal(store.transfers[0].status, 'error')
    assert.equal(store.transfers[0].error, 'record write failed')
  })
})

describe('transfer store: cancelAll', () => {
  test('cancels every live transfer', async () => {
    const { store, calls } = setup()
    const a = store.startTransfer(file('a.jpg'), 'upload')
    const b = store.startTransfer(file('b.jpg'), 'upload')

    store.cancelAll()
    await Promise.allSettled([a.promise, b.promise])

    assert.equal(calls[0].cancels, 1)
    assert.equal(calls[1].cancels, 1)
    assert.deepEqual(
      store.transfers.map((transfer) => transfer.status),
      ['cancelled', 'cancelled'],
    )
  })

  test('a cancelled transfer settles its promise, so awaiting callers are never stranded', async () => {
    const { store } = setup()
    const a = store.startTransfer(file('a.jpg'), 'upload')
    const b = store.startTransfer(file('b.jpg'), 'upload')

    // What `/add`'s submit does. Without settlement this would hang on a cancelled queue, and the
    // cancelled files would never be requeued.
    const results = Promise.allSettled([a.promise, b.promise])
    store.cancelAll('upload')

    const settled = await Promise.race([
      results,
      new Promise((resolve) => setTimeout(() => resolve('timed out'), 50)),
    ])
    assert.notEqual(settled, 'timed out')
    assert.deepEqual(
      (settled as PromiseSettledResult<string>[]).map((result) => result.status),
      ['rejected', 'rejected'],
    )
  })

  test('a kind scope leaves other kinds alone', async () => {
    const { store, calls } = setup()
    const queued = store.startTransfer(file('queued.jpg'), 'upload')
    const swapped = store.startTransfer(file('swapped.jpg'), 'swap')

    // What `/add`'s "Cancel all" does: it owns the queue uploads, not a swap started elsewhere.
    store.cancelAll('upload')
    await queued.promise.catch(() => {})

    assert.equal(store.transfers[0].status, 'cancelled')
    assert.equal(store.transfers[1].status, 'uploading')
    assert.equal(calls[1].cancels, 0)

    // Clean up the swap so its row does not outlive the test.
    swapped.cancel()
    await swapped.promise.catch(() => {})
  })

  test('cancels transfers started from another slice via getState()', async () => {
    const { upload, calls } = fakeUploader()
    const store = createTransferStore(upload)
    const handle = store.getState().startTransfer(file('a.jpg'), 'upload')

    // The cross-store call pattern `createPhotoOpsSlice` uses.
    store.getState().cancelTransfer(handle.id)
    await handle.promise.catch(() => {})

    assert.equal(calls[0].cancels, 1)
    assert.equal(store.getState().transfers[0].status, 'cancelled')
  })

  test('cancelTransfer on an unknown id does nothing', () => {
    const { store } = setup()
    store.cancelTransfer('nope')
    assert.equal(store.transfers.length, 0)
  })
})

describe('transfer store: errors', () => {
  test('isCancelled recognises both our error and the SDK code', () => {
    assert.equal(isCancelled(new TransferCancelledError('a')), true)
    assert.equal(isCancelled(Object.assign(new Error('x'), { code: 'storage/canceled' })), true)
    assert.equal(isCancelled(new TransferFailedError('a', 'boom')), false)
    assert.equal(isCancelled(new Error('boom')), false)
    assert.equal(isCancelled(null), false)
    assert.equal(isCancelled('boom'), false)
  })
})
