import React, { useMemo } from 'react'
import Link from 'next/link'
import AppButton from '../atoms/AppButton'
import { useAppStore } from '../../stores/appStore'
import { useUserStore } from '../../stores/userStore'
import { useValuesStore, selectNickValues } from '../../stores/valuesStore'
import { isEmpty, getYouTubeMaxResUrl } from '../../helpers'

interface PlainLayoutProps {
  children: React.ReactNode
}

export const PlainLayout: React.FC<PlainLayoutProps> = ({ children }) => {
  const lastRecord = useAppStore((state) => state.lastRecord)
  const user = useUserStore((state) => state.user)
  const nickValues = useValuesStore(selectNickValues)

  const showUrl = useMemo(() => {
    if (!lastRecord) return ''
    return lastRecord.kind === 'video' ? getYouTubeMaxResUrl(lastRecord.url) : lastRecord.url
  }, [lastRecord])

  const hasNoPhotos = isEmpty(nickValues)

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-light-page dark:bg-dark-page">
      {/* Left half: hero image or empty state */}
      {hasNoPhotos ? (
        <div className="flex flex-col justify-center items-center md:w-1/2 min-h-[50vh] md:min-h-screen">
          <div className="text-center max-w-xs px-6 text-sm text-gray-600 dark:text-gray-300">
            There are no photos posted yet...
            <br />
            To add some you need to sign-in with your Google account. Only authorized users can add,
            delete or edit photos.
            {user?.isAuthorized && user?.nick && (
              <div className="mt-4">
                <AppButton to="/add" color="primary" label="Add photos / videos" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative md:w-1/2 min-h-[50vh] md:min-h-screen overflow-hidden">
          <Link href="/list" className="block absolute inset-0">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
              style={showUrl ? { backgroundImage: `url(${showUrl})` } : {}}
            />
            {/* <div className="absolute inset-0 bg-[url('/logo.svg')] bg-center bg-contain bg-no-repeat opacity-40" /> */}
          </Link>

          {/* Add photos button */}
          {user?.isAuthorized && user?.nick && (
            <AppButton
              to="/add"
              icon="add"
              color="warning"
              round
              className="absolute bottom-4 right-4 md:bottom-4 md:left-4 md:right-auto p-3!"
            />
          )}
        </div>
      )}

      {/* Right half: Content (sign-in, error views, etc.) */}
      <div className="flex flex-col justify-center items-center md:w-1/2 min-h-[50vh] md:min-h-screen">
        {children}
      </div>
    </div>
  )
}

export default PlainLayout
