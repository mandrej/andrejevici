'use client'

import React from 'react'
import AppButton from '../../components/atoms/AppButton'
import AppIcon from '../../components/atoms/AppIcon'
import PlainLayout from '../../components/layouts/PlainLayout'

export default function UnauthorizedPage() {
  return (
    <PlainLayout>
      <div className="w-full max-w-sm mx-auto px-4">
        <div className="text-center py-6">
          <div className="mb-4 text-gray-300 dark:text-gray-600 flex justify-center">
            <AppIcon name="priority_high" className="w-20 h-20" />
          </div>
          <div className="text-8xl font-thin text-gray-300 dark:text-gray-600 mb-2">401</div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Insufficient credentials...
          </p>
        </div>
        <hr className="border-gray-200 dark:border-gray-700 mb-4" />
        <div className="flex justify-center">
          <AppButton to="/" flat label="Go Home" />
        </div>
      </div>
    </PlainLayout>
  )
}
