'use client'

import React from 'react'
import Link from 'next/link'
import { useAppStore } from '@/stores/appStore'
import { useScreen } from '@/composables/useScreen'
import GlobalSearch from '@/components/GlobalSearch'
import AppProgress from '@/components/atoms/AppProgress'

export const ListToolbar: React.FC = () => {
  const busy = useAppStore((state) => state.busy)
  const screen = useScreen()

  return (
    <>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {screen.gtXs && (
          <Link
            href="/"
            className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap hover:opacity-80 transition-opacity"
          >
            Browse
          </Link>
        )}
        <GlobalSearch />
      </div>

      {/* Progress bar below the header */}
      {busy && (
        <div className="fixed top-14 left-0 right-0 z-30 h-0.5 overflow-hidden">
          <AppProgress indeterminate color="warning" height={2} />
        </div>
      )}
    </>
  )
}

export default ListToolbar
