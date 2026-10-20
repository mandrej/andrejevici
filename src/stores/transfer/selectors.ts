import type { Transfer, TransferKind, TransferStatus } from '@/stores/transfer/types'

const TERMINAL: TransferStatus[] = ['completed', 'error', 'cancelled']

export const isTerminalTransfer = (transfer: Transfer): boolean =>
  TERMINAL.includes(transfer.status)

/** True while a transfer is still moving bytes. */
export const isActiveTransfer = (transfer: Transfer): boolean =>
  transfer.status === 'pending' || transfer.status === 'uploading'

/**
 * Cheap boolean gate for "is anything transferring right now".
 *
 * Returns a primitive rather than a filtered array on purpose: a selector that builds a new array
 * on each call yields a fresh identity every render, which makes Zustand v5 re-render forever.
 * Components that need the list should subscribe to the raw `transfers` array and narrow with
 * `useMemo`.
 */
export const selectHasActiveTransfers = (state: { transfers: Transfer[] }): boolean =>
  state.transfers.some(isActiveTransfer)

/** Same gate, narrowed to the queue uploads that `/add`'s "Cancel all" owns. */
export const selectHasActiveKind =
  (kind: TransferKind) =>
  (state: { transfers: Transfer[] }): boolean =>
    state.transfers.some((transfer) => transfer.kind === kind && isActiveTransfer(transfer))
