import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { ProgressThrottle, UploadTracker, type ProgressSample } from '@/helpers/uploadTracker'

const tracker = (filename = 'abc12345_photo.jpg') => new UploadTracker(filename)

describe('UploadTracker', () => {
  test('starts pending and only accepts a task once', () => {
    const t = tracker()
    assert.equal(t.status, 'pending')
    assert.equal(t.isTerminal(), false)

    t.start({ cancel: () => {} })
    assert.equal(t.status, 'uploading')
    assert.throws(() => t.start({ cancel: () => {} }), /Cannot start a uploading transfer/)
  })

  test('records bytes and never reports above 100%', () => {
    const t = tracker()
    t.start({ cancel: () => {} })

    t.updateProgress(50, 200)
    assert.equal(t.progress, 0.25)
    assert.equal(t.bytesTransferred, 50)

    // A resumed upload can report more bytes than the total it first announced.
    t.updateProgress(300, 200)
    assert.equal(t.progress, 1)
  })

  test('a zero total yields 0 rather than NaN', () => {
    const t = tracker()
    t.start({ cancel: () => {} })
    t.updateProgress(0, 0)
    assert.equal(t.progress, 0)
  })

  test('ignores progress once terminal', () => {
    const t = tracker()
    t.start({ cancel: () => {} })
    t.finish('https://example.test/a.jpg')

    t.updateProgress(10, 100)
    assert.equal(t.status, 'completed')
    assert.equal(t.progress, 1)
  })

  test('finish only applies while uploading', () => {
    const pending = tracker()
    pending.finish('https://example.test/a.jpg')
    assert.equal(pending.status, 'pending')
    assert.equal(pending.downloadURL, null)
  })

  test('a failure keeps the last known progress', () => {
    const t = tracker()
    t.start({ cancel: () => {} })
    t.updateProgress(30, 100)
    t.fail(new Error('network'))

    assert.equal(t.status, 'error')
    assert.equal(t.progress, 0.3, 'the bar should not jump back to zero')
    assert.equal(t.error?.message, 'network')
  })

  test('a failure after a cancel leaves the cancel standing', () => {
    const t = tracker()
    t.start({ cancel: () => {} })
    t.cancel()
    assert.equal(t.status, 'cancelled')

    // What the Storage SDK does: cancelling makes it emit a `storage/canceled` error event.
    t.fail(new Error('storage/canceled'))
    assert.equal(t.status, 'cancelled')
    assert.equal(t.error, null)
  })

  test('a failure after a success is ignored', () => {
    const t = tracker()
    t.start({ cancel: () => {} })
    t.finish('https://example.test/a.jpg')
    t.fail(new Error('storage/canceled'))
    assert.equal(t.status, 'completed')
  })

  test('cancel reaches the underlying task and is idempotent', () => {
    let cancels = 0
    const t = tracker()
    t.start({ cancel: () => cancels++ })

    t.cancel()
    t.cancel()
    assert.equal(cancels, 1)
    assert.equal(t.status, 'cancelled')
  })
})

/** A hand-driven scheduler, so throttle behaviour is asserted without waiting on real time. */
const harness = (minIntervalMs?: number) => {
  const batches: ProgressSample[][] = []
  const scheduled: Array<() => void> = []
  // Starts past the interval, like the real clock does, so the first report is a leading edge.
  let clock = 10_000

  const throttle = new ProgressThrottle({
    flush: (batch) => batches.push(batch),
    minIntervalMs,
    schedule: (run) => {
      scheduled.push(run)
      return scheduled.length - 1
    },
    unschedule: (handle) => {
      scheduled[handle as number] = () => {}
    },
    now: () => clock,
  })

  return {
    throttle,
    batches,
    /** Runs every callback the throttle has scheduled, as a timer tick would. */
    tick: () => {
      const pending = [...scheduled]
      scheduled.length = 0
      pending.forEach((run) => run())
    },
    advance: (ms: number) => {
      clock += ms
    },
  }
}

describe('ProgressThrottle', () => {
  test('a leading edge flushes immediately', () => {
    const h = harness()
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })

    assert.equal(h.batches.length, 1)
    assert.equal(h.batches[0][0].bytes, 10)
  })

  test('reports inside the interval collapse into one trailing flush of the newest value', () => {
    const h = harness()
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })
    h.throttle.report({ id: 'a', bytes: 20, total: 100, progress: 0.1 })
    h.throttle.report({ id: 'a', bytes: 30, total: 100, progress: 0.1 })

    assert.equal(h.batches.length, 1, 'nothing else flushes until the interval elapses')

    h.advance(200)
    h.tick()
    assert.equal(h.batches.length, 2)
    assert.equal(h.batches[1].length, 1, 'one sample per transfer, not one per report')
    assert.equal(h.batches[1][0].bytes, 30, 'the newest byte count wins')
  })

  test('an unchanged byte count schedules nothing', () => {
    const h = harness()
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })
    // What a resumed upload does: re-emits the same count.
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })
    h.advance(200)
    h.tick()

    assert.equal(h.batches.length, 1)
  })

  test('a full queue costs one flush, not one per file', () => {
    const h = harness()
    // First report spends the leading edge, so the rest of the queue shares one trailing flush.
    h.throttle.report({ id: 'z', bytes: 1, total: 100, progress: 0.1 })
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })
    h.throttle.report({ id: 'b', bytes: 20, total: 200, progress: 0.1 })

    h.tick()
    assert.equal(h.batches.length, 2)
    assert.deepEqual(h.batches[1].map((sample) => sample.id).sort(), ['a', 'b'])
  })

  test('flushNow bypasses the interval', () => {
    const h = harness()
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })
    h.throttle.report({ id: 'a', bytes: 90, total: 100, progress: 0.1 })
    h.throttle.flushNow()

    assert.equal(h.batches.length, 2)
    assert.equal(h.batches[1][0].bytes, 90)
  })

  test('flushNow with nothing pending flushes nothing', () => {
    const h = harness()
    h.throttle.flushNow()
    assert.equal(h.batches.length, 0)
  })

  test('a dropped transfer is not resurrected by a queued flush', () => {
    const h = harness()
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })
    h.throttle.report({ id: 'a', bytes: 20, total: 100, progress: 0.1 })
    h.throttle.drop('a')

    h.advance(200)
    h.tick()
    assert.equal(h.batches.length, 1, 'only the leading flush, which already happened')
  })

  test('a dropped transfer may report again from scratch', () => {
    const h = harness()
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })
    h.throttle.drop('a')
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })

    h.advance(200)
    h.tick()
    assert.equal(h.batches.length, 2)
  })

  test('dispose cancels a scheduled flush', () => {
    const h = harness()
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })
    h.throttle.report({ id: 'a', bytes: 20, total: 100, progress: 0.1 })
    h.throttle.dispose()

    h.advance(200)
    h.tick()
    assert.equal(h.batches.length, 1)
  })

  test('defaults to a 100ms interval', () => {
    const h = harness(undefined)
    h.throttle.report({ id: 'a', bytes: 10, total: 100, progress: 0.1 })

    // Just short of the interval: the report is held for the trailing flush.
    h.advance(99)
    h.throttle.report({ id: 'a', bytes: 20, total: 100, progress: 0.1 })
    assert.equal(h.batches.length, 1)

    // The trailing timer fires when the interval elapses, carrying the newest byte count.
    h.advance(1)
    h.tick()
    assert.equal(h.batches.length, 2)
    assert.equal(h.batches[1][0].bytes, 20)
  })
})
