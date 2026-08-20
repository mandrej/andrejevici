'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DefaultLayout from '@/components/layouts/DefaultLayout'
import { useAppStore } from '@/stores/appStore'
import { useValuesStore } from '@/stores/valuesStore'
import { useBucketStore } from '@/stores/bucketStore'
import { useUserStore } from '@/stores/userStore'
import { formatDatum, formatBytes } from '@/helpers'
import AdminCard from '@/app/admin/AdminCard'
import AppBadge from '@/components/atoms/AppBadge'
import AppButton from '@/components/atoms/AppButton'
import MetaTab from '@/app/admin/MetaTab'
import UsersTab from '@/app/admin/UsersTab'
import { mismatch, missingThumbnails, fix } from '@/helpers/remedy'
import CONFIG from '@/config'

export default function AdminPage() {
  const router = useRouter()
  const adminTab = useAppStore((state) => state.adminTab)
  const values = useValuesStore((state) => state.values)
  const countersBuildAll = useValuesStore((state) => state.countersBuild)
  const bucket = useBucketStore((state) => state.bucket)
  const bucketBuild = useBucketStore((state) => state.bucketBuild)
  const user = useUserStore((state) => state.user)
  const initialized = useUserStore((state) => state.initialized)

  useEffect(() => {
    if (initialized && !user?.isAdmin) {
      router.replace('/401')
    }
  }, [initialized, user, router])

  if (!initialized || !user?.isAdmin) {
    return null
  }

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
              action={<AppButton flat label="Calculate" onClick={bucketBuild} color="primary" />}
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

            {/* Fix Photo IDs Card */}
            <AdminCard
              icon="aspect_ratio"
              color="accent"
              title="Convert date to Timestamp"
              description="Convert date string field to Firestore Timestamp object in photo documents."
              details={
                <div className="text-center mt-2">
                  <AppBadge color="accent" className="text-base px-4 py-2">
                    Run on: {formatDatum(new Date('2026-08-16'), 'DD.MM.YYYY')}
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
              action={<AppButton flat label="Scan" color="warning" onClick={missingThumbnails} />}
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
        )}

        {/* Meta panel */}
        {adminTab === 'meta' && <MetaTab />}

        {/* Users panel */}
        {adminTab === 'users' && <UsersTab />}
      </div>
    </DefaultLayout>
  )
}
