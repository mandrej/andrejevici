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
import AppButton from '@/components/atoms/AppButton'
import ThemeToggle from '@/components/atoms/ThemeToggle'
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
            {/* Theme Settings Card */}
            <AdminCard
              icon="dark_mode"
              color="primary"
              title="Theme Settings"
              description="Customize application appearance (Light, Dark, or System mode)."
              action={<ThemeToggle flat />}
            />

            {/* Bucket Card */}
            <AdminCard
              icon="storage"
              color="secondary"
              title="Bucket Status"
              description="Current total storage usage and file count. Updated via cron job every 3 days."
              details={
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {Intl.NumberFormat().format(bucket.count)} photos / {formatBytes(bucket.size)}
                </div>
              }
              action={<AppButton label="Calculate" onClick={bucketBuild} color="secondary" />}
            />

            {/* Field Values Card */}
            <AdminCard
              icon="schema"
              color="secondary"
              title="Metadata Counters"
              description="Rebuild index counters for all metadata fields. Updated via cron job every 3 days."
              details={
                <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {Object.entries(values)
                    .map(([key, val]) => `${key}: ${Object.keys(val || {}).length}`)
                    .join(' · ')}
                </div>
              }
              action={<AppButton label="Build" onClick={handleCountersBuild} color="secondary" />}
            />

            {/* Sync Photo Contributors Card */}
            <AdminCard
              icon="group"
              color="accent"
              title="Sync Photo Contributors"
              description="Add photo contributors to the user collection if they do not already exist."
              details={
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Run on: {formatDatum(new Date('2026-09-23'), 'DD.MM.YYYY')}
                </div>
              }
              action={<AppButton color="accent" label="Sync Users" onClick={fix} />}
            />

            {/* Thumbnails Card */}
            <AdminCard
              icon="image_not_supported"
              color="warning"
              title="Missing Thumbnails"
              description="Scan storage for photos missing thumbnails and generate them."
              action={<AppButton label="Create" color="warning" onClick={missingThumbnails} />}
            />

            {/* Mismatch Card */}
            <AdminCard
              icon="sync_problem"
              color="negative"
              title="Storage Mismatch"
              description="Resolve inconsistencies between Cloud Storage and Firestore."
              action={<AppButton color="negative" label="Resolve" onClick={mismatch} />}
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
