'use client'

import React, { useMemo } from 'react'
import DefaultLayout from '../../components/layouts/DefaultLayout'
import { useAppStore } from '../../stores/appStore'
import { useValuesStore } from '../../stores/valuesStore'
import { useUserStore } from '../../stores/userStore'
import CONFIG from '../../config'
import TagsMerge from '../../components/TagsMerge'
import VideoTab from '../../components/tab/VideoTab'
import PhotoTab from '../../components/tab/PhotoTab'
import AppInput from '../../components/atoms/AppInput'
import AppIcon from '../../components/atoms/AppIcon'

export default function AddPage() {
  const addTab = useAppStore((state) => state.addTab)
  const headlineToApply = useValuesStore((state) => state.headlineToApply)
  const setHeadlineToApply = (val: string) => useValuesStore.setState({ headlineToApply: val })
  const user = useUserStore((state) => state.user)

  const canAddPhoto = useMemo(() => {
    return !!user?.isAuthorized && !!user?.nick
  }, [user])

  return (
    <DefaultLayout>
      {/* Page header banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <AppIcon
          name={addTab === 'photo' ? 'upload' : 'video_library'}
          className="w-6 h-6 text-primary"
        />
        <span className="text-lg font-semibold text-gray-900 dark:text-white">
          {addTab === 'photo' ? 'Upload / publish images' : 'Link videos'}
        </span>
      </div>

      {canAddPhoto ? (
        <>
          {/* Tab panels driven by addTab store */}
          <div className="p-4">{addTab === 'photo' ? <PhotoTab /> : <VideoTab />}</div>

          {/* Headline + tags inputs */}
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
        </>
      ) : (
        <div className="p-4 text-center">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 text-amber-800 dark:text-amber-200">
            <AppIcon name="warning" className="w-6 h-6 shrink-0" />
            <span className="text-sm">
              Only authorized users with a defined nickname can upload photos.
            </span>
          </div>
        </div>
      )}
    </DefaultLayout>
  )
}
