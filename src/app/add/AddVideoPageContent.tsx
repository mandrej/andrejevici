'use client'

import React from 'react'
import DefaultLayout from '@/components/layouts/DefaultLayout'
import VideoTab from '@/components/tab/VideoTab'

export default function AddVideoPageContent() {
  return (
    <DefaultLayout>
      <div className="p-4">
        <VideoTab />
      </div>
    </DefaultLayout>
  )
}
