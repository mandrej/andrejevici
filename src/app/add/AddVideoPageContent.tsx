'use client'

import React from 'react'
import DefaultLayout from '@/components/layouts/DefaultLayout'
import VideoTab from '@/components/tab/VideoTab'
import AppIcon from '@/components/atoms/AppIcon'

export default function AddVideoPageContent() {
  return (
    <DefaultLayout>
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <AppIcon name="video_library" className="w-6 h-6 text-primary" />
        <span className="text-lg font-semibold text-gray-900 dark:text-white">Link videos</span>
      </div>

      <div className="p-4">
        <VideoTab />
      </div>
    </DefaultLayout>
  )
}
