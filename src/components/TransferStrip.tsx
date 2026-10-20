'use client'

import React, { useMemo } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useTransferStore, isActiveTransfer } from '@/stores/transferStore'
import AppProgress from '@/components/atoms/AppProgress'

/**
 * The single progress surface for the app, rendered once inside the header.
 *
 * Prefers the per-transfer segments whenever bytes are moving, and falls back to the
 * indeterminate bar while `busy` covers work with no measurable progress (a record fetch, or the
 * record rewrite that follows a swap's upload). Only one of the two ever shows, so the two states
 * cannot stack on the same edge.
 */
export const TransferStrip: React.FC = () => {
  // Subscribe to the raw array: it keeps its identity between updates, unlike a filtered copy.
  const transfers = useTransferStore((state) => state.transfers)
  const busy = useAppStore((state) => state.busy)

  const active = useMemo(() => transfers.filter(isActiveTransfer), [transfers])

  if (active.length === 0) {
    return busy ? (
      <div className="absolute bottom-0 left-0 right-0 z-30 h-0.5 overflow-hidden">
        <AppProgress indeterminate color="warning" height={2} />
      </div>
    ) : null
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex overflow-hidden">
      {active.map((transfer) => (
        <div
          key={transfer.id}
          style={{ width: `${100 / active.length}%` }}
          className="h-0.5 overflow-hidden bg-gray-200 dark:bg-gray-700"
          role="progressbar"
          aria-label={`${transfer.kind === 'swap' ? 'Replacing with' : 'Uploading'} ${transfer.label}`}
          aria-valuenow={Math.round(transfer.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          title={`${transfer.kind === 'swap' ? 'Swap' : 'Upload'}: ${transfer.label} — ${Math.round(
            transfer.progress * 100,
          )}%`}
        >
          <AppProgress value={transfer.progress} color="warning" height={2} durationMs={100} />
        </div>
      ))}
    </div>
  )
}

export default TransferStrip
