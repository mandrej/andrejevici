'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppButton from '@/components/atoms/AppButton'
import AppChip from '@/components/atoms/AppChip'
import AppIcon from '@/components/atoms/AppIcon'
import AppDialog from '@/components/atoms/AppDialog'
import PlainLayout from '@/components/layouts/PlainLayout'
import { useScreen } from '@/composables/useScreen'
import { useAppStore } from '@/stores/appStore'
import { useUserStore } from '@/stores/userStore'
import { useValuesStore, selectNickWithCount, selectYearValues } from '@/stores/valuesStore'
import { useBucketStore } from '@/stores/bucketStore'

export default function HomePage() {
  const router = useRouter()
  const [showTechStack, setShowTechStack] = useState(false)

  // Zustand State selectors
  const user = useUserStore((state) => state.user)
  const signIn = useUserStore((state) => state.signIn)

  const searchBy = useAppStore((state) => state.searchBy)

  const bucket = useBucketStore((state) => state.bucket)

  const screen = useScreen()

  const nickWithCount = useValuesStore(selectNickWithCount)
  const yearValues = useValuesStore(selectYearValues)

  const allNicks = useMemo(() => {
    return Object.keys(nickWithCount)
  }, [nickWithCount])

  const nicks = screen.xs ? allNicks.slice(0, 5) : allNicks

  // `selectYearValues` is newest-first, so `slice(0, 5)` keeps the five latest years.
  const allYears = useMemo<string[]>(() => yearValues.filter(Boolean), [yearValues])
  const years = screen.xs ? allYears.slice(0, 5) : allYears

  const sinceYear = useMemo(() => {
    return yearValues[yearValues.length - 1] || ''
  }, [yearValues])

  const buildVersion = process.env.NEXT_PUBLIC_BUILD || '15.07.2026 18:42'

  const handlePhotographerClick = (nick: string) => {
    searchBy({ nick }, () => {
      router.push('/list')
    })
  }

  const handleYearClick = (year: string) => {
    searchBy({ year: parseInt(year, 10) }, () => {
      router.push('/list')
    })
  }

  return (
    <PlainLayout>
      <div className="flex flex-col items-center justify-center text-center p-6 w-full max-w-md">
        <AppButton
          label={user ? `Hi ${user.nick || user.email}` : 'Sign in'}
          color="primary"
          onClick={signIn}
          flat={user !== null}
          className="mb-4"
        />

        <button
          onClick={() => setShowTechStack(true)}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors cursor-pointer mb-1"
          title="Click to view Agents tech stack"
        >
          <span>Build {buildVersion}</span>
          <AppIcon name="info" className="w-3.5 h-3.5" />
        </button>
        <h1 className="text-4xl font-thin text-gray-900 dark:text-white mb-2">ANDрејевићи</h1>

        {bucket.count > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {bucket.count} photos since {sinceYear} and counting
          </div>
        )}

        {/* Year filter — same chip style as the active year filter in GlobalSearch */}
        {years.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-2 mx-8">
            {years.map((year) => (
              <AppChip
                key={year}
                variant="date"
                size="md"
                label={year}
                onClick={() => handleYearClick(year)}
                title={`Show photos from ${year}`}
              />
            ))}
          </div>
        )}

        {/* Top photographers — same chip style as the nick filter in GlobalSearch */}
        {nicks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-2 mx-8">
            {nicks.map((nick) => (
              <AppChip
                key={nick}
                variant="nick"
                size="md"
                label={nick}
                onClick={() => handlePhotographerClick(nick)}
                title={`Show photos by ${nick}`}
              />
            ))}
          </div>
        )}

        {/* Agents Tech Stack Dialog */}
        <AppDialog modelValue={showTechStack} onChange={setShowTechStack} maxWidth="max-w-md">
          <div className="p-6 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
              <div className="flex items-center gap-2">
                <AppIcon name="info" className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Application Tech Stack
                </h3>
              </div>
              <button
                onClick={() => setShowTechStack(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg"
              >
                <AppIcon name="close" className="w-5 h-5" />
              </button>
            </div>

            <ul className="space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
              <li>
                <strong className="text-gray-900 dark:text-white">Frontend:</strong> Next.js 16 (App
                Router) + React 19 + TypeScript + Tailwind CSS 4 + Headless UI + Heroicons
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">Backend:</strong> Firebase
                (Firestore, Cloud Storage, Auth, Functions, Messaging)
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">State Management:</strong> Zustand
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">Build &amp; PWA:</strong> Next.js
                Compiler + Webpack + Workbox (PWA)
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">Hosting:</strong> Firebase Hosting
              </li>
            </ul>

            <div className="mt-6 flex justify-end">
              <AppButton
                label="Close"
                color="primary"
                flat
                onClick={() => setShowTechStack(false)}
              />
            </div>
          </div>
        </AppDialog>
      </div>
    </PlainLayout>
  )
}
