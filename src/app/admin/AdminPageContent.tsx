'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DefaultLayout from '@/components/layouts/DefaultLayout'
import { useAppStore } from '@/stores/appStore'
import { useValuesStore } from '@/stores/valuesStore'
import { useBucketStore } from '@/stores/bucketStore'
import { useUserStore } from '@/stores/userStore'
import { formatDatum, formatBytes } from '@/helpers'
import AdminCard from '@/app/admin/AdminCard'
import AppButton from '@/components/atoms/AppButton'
import AppInput from '@/components/atoms/AppInput'
import ThemeToggle from '@/components/atoms/ThemeToggle'
import MetaTab from '@/app/admin/MetaTab'
import UsersTab from '@/app/admin/UsersTab'
import { mismatch, missingThumbnails, fix } from '@/helpers/remedy'
import { functions } from '@/firebase'
import { httpsCallable } from 'firebase/functions'
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

  const [userSearchEmail, setUserSearchEmail] = useState('')
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [userSearchResult, setUserSearchResult] = useState<{
    uid: string
    displayName?: string
  } | null>(null)
  const [userSearchError, setUserSearchError] = useState('')

  useEffect(() => {
    if (initialized && !user?.isAdmin) {
      router.replace('/401')
    }
  }, [initialized, user, router])

  if (!initialized || !user?.isAdmin) {
    return null
  }

  const handleUserSearch = async () => {
    const trimmed = userSearchEmail.trim()
    if (!trimmed) return

    setUserSearchLoading(true)
    setUserSearchError('')
    setUserSearchResult(null)

    try {
      const fetchUserRecord = httpsCallable<
        { email: string },
        { uid: string; displayName?: string } | null
      >(functions, 'functionUser')

      const res = await fetchUserRecord({ email: trimmed })
      if (res.data) {
        setUserSearchResult(res.data)
      } else {
        setUserSearchError('User not found')
      }
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string })?.message || 'Failed to search user'
      setUserSearchError(errorMsg)
    } finally {
      setUserSearchLoading(false)
    }
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
                  Run on: {formatDatum(new Date('2026-09-21'), 'DD.MM.YYYY')}
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

            {/* User Search Card */}
            <AdminCard
              icon="search"
              color="primary"
              title="Search User Data"
              description="Search user data by email using functionUser."
              details={
                <div className="flex flex-col gap-2 text-left">
                  <AppInput
                    type="email"
                    placeholder="name@example.com"
                    modelValue={userSearchEmail}
                    onChangeValue={(val) => {
                      setUserSearchEmail(val)
                      setUserSearchResult(null)
                      setUserSearchError('')
                    }}
                    clearable
                    disabled={userSearchLoading}
                    loading={userSearchLoading}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter') {
                        void handleUserSearch()
                      }
                    }}
                  />
                  {userSearchResult && (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2.5 border border-gray-200 dark:border-gray-700 space-y-1 text-xs">
                      <div>
                        <span className="font-semibold text-gray-500 dark:text-gray-400">
                          UID:{' '}
                        </span>
                        <span className="font-mono text-gray-900 dark:text-gray-100 select-all break-all">
                          {userSearchResult.uid}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-500 dark:text-gray-400">
                          DisplayName:{' '}
                        </span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">
                          {userSearchResult.displayName || (
                            <span className="text-gray-400 italic">None</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {userSearchError && (
                    <div className="text-xs text-negative">{userSearchError}</div>
                  )}
                </div>
              }
              action={
                <AppButton
                  label={userSearchLoading ? 'Searching...' : 'Search'}
                  color="primary"
                  onClick={handleUserSearch}
                  disabled={!userSearchEmail.trim() || userSearchLoading}
                />
              }
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
