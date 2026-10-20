import { createTransferStore } from '@/stores/transfer/createTransferSlice'

export type {
  TransferStore,
  Transfer,
  TransferKind,
  TransferStatus,
  TransferHandle,
} from '@/stores/transfer/types'
export { TransferCancelledError, TransferFailedError, isCancelled } from '@/stores/transfer/errors'
export {
  isActiveTransfer,
  isTerminalTransfer,
  selectHasActiveTransfers,
  selectHasActiveKind,
} from '@/stores/transfer/selectors'

/**
 * In-flight uploads and swaps.
 *
 * Ephemeral by design — no `persist` middleware. Unlike `appStore`, whose persisted writes would
 * fire a synchronous `localStorage.setItem` on every progress event, transfer state is only ever
 * meaningful while the tab is open.
 */
export const useTransferStore = createTransferStore()
