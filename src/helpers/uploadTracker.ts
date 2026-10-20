export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled'

/**
 * The only capability the tracker needs from an upload task. Narrowing it to this keeps the class
 * free of the Firebase SDK, which is what lets it be tested with a plain object instead of a
 * mocked `UploadTask`.
 */
export interface Cancellable {
  cancel: () => void
}

/**
 * Manages a single transfer with atomic state transitions.
 *
 * Deliberately framework-agnostic and store-unaware — it never imports the Firebase SDK at all, so
 * it is unit-testable with no DOM and no Firebase initialization. The transfer store drives it and
 * mirrors its state into React.
 *
 * Every terminal transition is idempotent. That matters because Firebase's `state_changed` can
 * deliver a failure *after* a success (and a `storage/canceled` error after a deliberate cancel);
 * throwing here would surface as an unhandled rejection inside an SDK callback.
 */
export class UploadTracker {
  /** Storage object name (`uuid8_original-name`); also the published record id. */
  filename: string
  status: UploadStatus = 'pending'
  /** 0..1. */
  progress = 0
  bytesTransferred = 0
  totalBytes = 0
  downloadURL: string | null = null
  error: Error | null = null
  task: Cancellable | null = null

  constructor(filename: string) {
    this.filename = filename
  }

  /**
   * Records the task and moves to `uploading`. The one place that throws: starting twice is a
   * programmer error, not a race.
   */
  start(task: Cancellable): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot start a ${this.status} transfer`)
    }
    this.task = task
    this.status = 'uploading'
  }

  /**
   * Records transferred bytes. Takes plain numbers rather than a Firebase snapshot so the class
   * stays independent of the SDK's shape. Guards the division — `totalBytes` can legitimately be
   * 0 before the size is known — and clamps, so a resumed upload cannot report above 100%.
   */
  updateProgress(bytesTransferred: number, totalBytes: number): void {
    if (this.status !== 'uploading') return
    this.bytesTransferred = bytesTransferred
    this.totalBytes = totalBytes
    this.progress = totalBytes > 0 ? Math.min(bytesTransferred / totalBytes, 1) : 0
  }

  /** Terminal: success. Idempotent — a success after a cancel leaves the cancel standing. */
  finish(downloadURL: string): void {
    if (this.status !== 'uploading') return
    this.downloadURL = downloadURL
    this.status = 'completed'
    this.progress = 1
    this.bytesTransferred = this.totalBytes || this.bytesTransferred
  }

  /**
   * Terminal: failure. No-ops once terminal, so the `storage/canceled` error the SDK raises
   * *because* we called `cancel()` cannot overwrite the deliberate cancellation. Keeps the last
   * known progress rather than resetting it, so the bar does not jump to zero.
   */
  fail(error: Error): void {
    if (this.isTerminal()) return
    this.error = error
    this.status = 'error'
  }

  /** Terminal: cancelled. No-ops once terminal. */
  cancel(): void {
    if (this.isTerminal()) return
    this.status = 'cancelled'
    this.task?.cancel()
  }

  /** True once the transfer has reached a terminal state. */
  isTerminal(): boolean {
    return this.status === 'completed' || this.status === 'error' || this.status === 'cancelled'
  }
}

/**
 * A progress report for one transfer. Carries `progress` already resolved, so the tracker stays
 * the single place that turns bytes into a fraction — recomputing it downstream would divide by a
 * legitimately-zero total and could pull a finished bar back down to 0.
 */
export interface ProgressSample {
  id: string
  bytes: number
  total: number
  /** 0..1. */
  progress: number
}

export interface ProgressThrottleOptions {
  /** Receives at most one batch per interval. */
  flush: (batch: ProgressSample[]) => void
  /** Minimum gap between flushes. Defaults to 100ms (≈10 renders/s). */
  minIntervalMs?: number
  /** Runs the delayed flush. */
  schedule?: (run: () => void) => unknown
  /** Cancels a scheduled flush. */
  unschedule?: (handle: unknown) => void
  now?: () => number
}

const DEFAULT_INTERVAL = 100

/**
 * Collapses a flood of progress events into at most one batch per interval, for every transfer at
 * once.
 *
 * One throttle serves all transfers on purpose: a per-transfer timer would mean up to
 * `CONFIG.fileMax` (10) independent callbacks, and therefore up to 10 store writes per frame during
 * a full queue. Here the queue costs the same as a single upload.
 *
 * A time interval — rather than `requestAnimationFrame` — because rAF is suspended in background
 * tabs, which would freeze progress and then jump on return, and because it does not exist under
 * `node:test`. Both the clock and the scheduler are injectable so tests are deterministic.
 */
export class ProgressThrottle {
  private pending = new Map<string, ProgressSample>()
  private lastBytes = new Map<string, number>()
  private handle: unknown = null
  private lastFlushAt = 0
  private readonly flush: (batch: ProgressSample[]) => void
  private readonly minInterval: number
  private readonly schedule: (run: () => void) => unknown
  private readonly unschedule: (handle: unknown) => void
  private readonly now: () => number

  constructor(options: ProgressThrottleOptions) {
    this.flush = options.flush
    this.minInterval = options.minIntervalMs ?? DEFAULT_INTERVAL
    this.schedule = options.schedule ?? ((run) => setTimeout(run, this.minInterval))
    this.unschedule = options.unschedule ?? ((handle) => clearTimeout(handle as never))
    this.now = options.now ?? (() => Date.now())
  }

  /**
   * Records the newest value for a transfer. Reports whose byte count has not moved are dropped —
   * Firebase re-emits the same `bytesTransferred` when an upload resumes. Byte count, not
   * `progress`, drives that check: a transfer can reach 100% without transferring its last byte.
   */
  report(sample: ProgressSample): void {
    if (this.lastBytes.get(sample.id) === sample.bytes && !this.pending.has(sample.id)) return

    this.pending.set(sample.id, sample)
    if (this.handle !== null) return

    if (this.now() - this.lastFlushAt >= this.minInterval) {
      this.emit()
      return
    }
    // The trailing flush runs at the interval, not at a computed remainder: `emit()` already
    // clears the handle, and one timer per interval is all the throttle ever needs.
    this.handle = this.schedule(() => {
      this.handle = null
      this.emit()
    })
  }

  /** Emits any pending reports immediately. Terminal transitions call this to bypass the interval. */
  flushNow(): void {
    this.emit()
  }

  /** Forgets a transfer, so a late report or a queued flush cannot resurrect it. */
  drop(id: string): void {
    this.pending.delete(id)
    this.lastBytes.delete(id)
  }

  /** Cancels any scheduled flush. */
  dispose(): void {
    if (this.handle !== null) {
      this.unschedule(this.handle)
      this.handle = null
    }
    this.pending.clear()
    this.lastBytes.clear()
  }

  private emit(): void {
    if (this.handle !== null) {
      this.unschedule(this.handle)
      this.handle = null
    }
    if (this.pending.size === 0) return

    const batch = [...this.pending.values()]
    this.pending.clear()
    this.lastFlushAt = this.now()
    for (const sample of batch) this.lastBytes.set(sample.id, sample.bytes)
    this.flush(batch)
  }
}
