'use client'

import React from 'react'
import DefaultLayout from '@/components/layouts/DefaultLayout'
import { useValuesStore } from '@/stores/valuesStore'
import CONFIG from '@/config'
import TagsMerge from '@/components/TagsMerge'
import PhotoTab from '@/app/add/PhotoTab'
import AppInput from '@/components/atoms/AppInput'

export default function AddPhotoPageContent() {
  const headlineToApply = useValuesStore((state) => state.headlineToApply)
  const setHeadlineToApply = (val: string) => useValuesStore.setState({ headlineToApply: val })

  return (
    <DefaultLayout>
      <div className="p-4">
        <PhotoTab />
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
