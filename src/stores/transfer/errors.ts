/**
 * The user aborted the transfer, so a caller should requeue the file quietly instead of reporting
 * a failure they did not cause.
 */
export class TransferCancelledError extends Error {
  readonly cancelled = true
  constructor(public readonly transferId: string) {
    super(`Transfer ${transferId} cancelled`)
    this.name = 'TransferCancelledError'
  }
}

/** The transfer failed. Carries its id, so callers never have to smuggle it through a message. */
export class TransferFailedError extends Error {
  constructor(
    public readonly transferId: string,
    message: string,
  ) {
    super(message)
    this.name = 'TransferFailedError'
  }
}

/** True for a deliberate cancellation, including the `storage/canceled` error the SDK raises. */
export const isCancelled = (err: unknown): boolean =>
  err instanceof TransferCancelledError ||
  (typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'storage/canceled')
