'use client'

import React from 'react'
import AppButton from '@/components/atoms/AppButton'
import AppIcon from '@/components/atoms/AppIcon'
import PlainLayout from '@/components/layouts/PlainLayout'

export default function UnauthorizedPageContent() {
  return (
    <PlainLayout>
      <div className="w-full max-w-sm md:max-w-lg mx-auto px-4">
        <div className="text-center py-6 md:py-14">
          <div className="mb-4 md:mb-6 text-gray-300 dark:text-gray-600 flex justify-center">
            <AppIcon name="priority_high" className="w-20 h-20 md:w-40 md:h-40" />
          </div>
          <div className="text-5xl md:text-7xl font-thin text-gray-300 dark:text-gray-600 mb-2 md:mb-4">
            401
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 md:mb-8">
            Insufficient credentials...
          </p>
        </div>
        <hr className="border-gray-200 dark:border-gray-700 mb-4 md:mb-6" />
        <div className="flex justify-center">
          <AppButton to="/" flat label="Go Home" />
        </div>
      </div>
    </PlainLayout>
  )
}
