'use client'

import React from 'react'
import DefaultLayout from '../../components/layouts/DefaultLayout'
import { useAppStore } from '../../stores/appStore'
import { useValuesStore } from '../../stores/valuesStore'
import { useBucketStore } from '../../stores/bucketStore'
import { formatDatum, formatBytes } from '../../helpers'
import AdminCard from '../../components/AdminCard'
import AppBadge from '../../components/atoms/AppBadge'
import AppButton from '../../components/atoms/AppButton'
import AppIcon from '../../components/atoms/AppIcon'
import MetaTab from '../../components/tab/MetaTab'
import UsersTab from '../../components/tab/UsersTab'
import { mismatch, missingThumbnails, fix } from '../../helpers/remedy'
import CONFIG from '../../config'

export default function AdminPage() {
  const adminTab = useAppStore((state) => state.adminTab)
  const values = useValuesStore((state) => state.values)
  const countersBuildAll = useValuesStore((state) => state.countersBuild)
  const bucket = useBucketStore((state) => state.bucket)
  const bucketBuild = useBucketStore((state) => state.bucketBuild)

  const handleCountersBuild = async () => {
    for (const field of CONFIG.photo_filter) {
      await countersBuildAll(field)
    }
  }

  return (
    <DefaultLayout>
      <div className="min-h-full">
        {/* Repair panel */}
        {adminTab === 'repair' && (
          <>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-55 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <AppIcon name="construction" className="w-6 h-6 text-primary" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Rebuild / Repair
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {/* Bucket Card */}
              <AdminCard
                icon="storage"
                color="primary"
                title="Bucket Status"
                description="Current total storage usage and file count. Updated via cron job every 3 days."
                details={
                  <div className="text-center py-2">
                    <AppBadge color="warning" textColor="black" className="text-base px-4 py-2">
                      {Intl.NumberFormat().format(bucket.count)} photos &nbsp;/&nbsp;{' '}
                      {formatBytes(bucket.size)}
                    </AppBadge>
                  </div>
                }
                action={
                  <AppButton flat label="Calculate" onClick={bucketBuild} color="primary" />
                }
              />

              {/* Field Values Card */}
              <AdminCard
                icon="schema"
                color="secondary"
                title="Metadata Counters"
                description="Rebuild index counters for all metadata fields. Updated via cron job every 3 days."
                details={
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(values).map(([key, val]) => (
                      <AppBadge
                        key={key}
                        color="secondary"
                        textColor="black"
                        className="text-base px-4 py-2"
                      >
                        {key}: {Object.keys(val || {}).length}
                      </AppBadge>
                    ))}
                  </div>
                }
                action={
                  <AppButton flat label="Build" onClick={handleCountersBuild} color="secondary" />
                }
              />

              {/* Dimensions Card */}
              <AdminCard
                icon="aspect_ratio"
                color="accent"
                title="Add photo kind"
                description="Populates kind 'photo' where missing in Photo collection."
                details={
                  <div className="text-center mt-2">
                    <AppBadge color="accent" className="text-base px-4 py-2">
                      Last run: {formatDatum(new Date('2026-05-05'), 'DD.MM.YYYY')}
                    </AppBadge>
                  </div>
                }
                action={<AppButton flat color="accent" label="Run Fix" onClick={fix} />}
              />

              {/* Thumbnails Card */}
              <AdminCard
                icon="image_not_supported"
                color="warning"
                title="Missing Thumbs"
                description="Scan storage for images that are missing generated thumbnails."
                action={
                  <AppButton flat label="Scan" color="warning" onClick={missingThumbnails} />
                }
              />

              {/* Mismatch Card */}
              <AdminCard
                icon="sync_problem"
                color="negative"
                title="Storage Mismatch"
                description="Resolve inconsistencies between Cloud Storage and Firestore."
                action={<AppButton flat color="negative" label="Resolve" onClick={mismatch} />}
              />
            </div>
          </>
        )}

        {/* Meta panel */}
        {adminTab === 'meta' && <MetaTab />}

        {/* Users panel */}
        {adminTab === 'users' && <UsersTab />}
      </div>
    </DefaultLayout>
  )
}
