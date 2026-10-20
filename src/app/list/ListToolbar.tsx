'use client'

import React from 'react'
import Link from 'next/link'
import { useScreen } from '@/composables/useScreen'
import GlobalSearch from '@/components/GlobalSearch'

export const ListToolbar: React.FC = () => {
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
    </>
  )
}

export default ListToolbar
