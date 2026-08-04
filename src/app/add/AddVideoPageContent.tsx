'use client'

import React from 'react'
import DefaultLayout from '@/components/layouts/DefaultLayout'
import { useValuesStore } from '@/stores/valuesStore'
import CONFIG from '@/config'
import TagsMerge from '@/components/TagsMerge'
import VideoTab from '@/components/tab/VideoTab'
import AppInput from '@/components/atoms/AppInput'
import AppIcon from '@/components/atoms/AppIcon'

export default function AddVideoPageContent() {
  const headlineToApply = useValuesStore((state) => state.headlineToApply)
  const setHeadlineToApply = (val: string) => useValuesStore.setState({ headlineToApply: val })

  return (
    <DefaultLayout>
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <AppIcon name="video_library" className="w-6 h-6 text-primary" />
        <span className="text-lg font-semibold text-gray-900 dark:text-white">Link videos</span>
      </div>

      <div className="p-4">
        <VideoTab />
      </div>

      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4 bg-gray-50 dark:bg-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppInput
            modelValue={headlineToApply}
            onChangeValue={setHeadlineToApply}
            label="Headline to apply"
            placeholder={`If empty, '${CONFIG.noTitle}' is used`}
            clearable
          />
          <TagsMerge label="Tags to apply" hint="You can add / remove tag later" />
        </div>
      </div>
    </DefaultLayout>
  )
}
