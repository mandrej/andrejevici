'use client'

import React from 'react'
import Link from 'next/link'
import { useAppStore } from '@/stores/appStore'
import AppProgress from '@/components/atoms/AppProgress'

export const AdminToolbar: React.FC = () => {
  const busy = useAppStore((state) => state.busy)
  const adminTab = useAppStore((state) => state.adminTab)
  const setAdminTab = useAppStore((state) => state.setAdminTab)

  const tabs = [
    { name: 'repair', label: 'Repair' },
    { name: 'meta', label: 'Metadata' },
    { name: 'users', label: 'Users' },
  ] as const

  const headline =
    adminTab === 'repair' ? 'Build / repair' : adminTab === 'meta' ? 'Metadata' : 'Users'

  return (
    <>
      {/* Inner Headline */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <Link
          href="/"
          className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap hover:opacity-80 transition-opacity"
        >
          {headline}
        </Link>
      </div>

      {/* Progress bar below the header */}
      {busy && (
        <div className="fixed top-14 left-0 right-0 z-30 h-0.5 overflow-hidden">
          <AppProgress indeterminate color="warning" height={2} />
        </div>
      )}

      {/* Admin tab switcher without icons */}
      <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 ml-2">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            className={`flex items-center px-3 py-1.5 text-sm transition-colors ${
              adminTab === tab.name
                ? 'bg-primary text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={tab.label}
            onClick={() => setAdminTab(tab.name)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}

export default AdminToolbar
