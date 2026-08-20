'use client'

import React from 'react'
import Link from 'next/link'
import { useAppStore } from '@/stores/appStore'
import AppProgress from '@/components/atoms/AppProgress'

export const AddToolbar: React.FC = () => {
  const progressInfo = useAppStore((state) => state.progressInfo)
  const addTab = useAppStore((state) => state.addTab)
  const setAddTab = useAppStore((state) => state.setAddTab)

  const tabs = [
    { name: 'photo', label: 'Images' },
    { name: 'video', label: 'Videos' },
  ] as const

  const headline = addTab === 'photo' ? 'Upload / publish' : 'Link videos'

  const progressKeys = Object.keys(progressInfo || {})

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

      {/* Per-file upload progress bars */}
      {progressKeys.length > 0 && (
        <div className="fixed top-14 left-0 right-0 z-30 flex overflow-hidden">
          {progressKeys.map((name) => {
            const value = (progressInfo as Record<string, number>)[name] ?? 0
            return (
              <div
                key={name}
                style={{ width: `${100 / progressKeys.length}%` }}
                className="h-0.5 overflow-hidden bg-gray-200 dark:bg-gray-700"
              >
                <AppProgress value={value} color="warning" height={2} />
              </div>
            )
          })}
        </div>
      )}

      {/* Tab switcher without icons */}
      <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 ml-2">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            className={`flex items-center px-3 py-1.5 text-sm transition-colors ${
              addTab === tab.name
                ? 'bg-primary text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            onClick={() => setAddTab(tab.name)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}

export default AddToolbar
