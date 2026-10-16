import React, { useEffect, useMemo } from 'react'
import Link from 'next/link'
import AppButton from '@/components/atoms/AppButton'
import { useAppStore } from '@/stores/appStore'
import { useUserStore } from '@/stores/userStore'
import { useValuesStore, selectNickValues } from '@/stores/valuesStore'
import { isEmpty, getYouTubeMaxResUrl, canContribute } from '@/helpers'

interface PlainLayoutProps {
  children: React.ReactNode
}

export const PlainLayout: React.FC<PlainLayoutProps> = ({ children }) => {
  const lastRecord = useAppStore((state) => state.lastRecord)
  const subscribeLastRec = useAppStore((state) => state.subscribeLastRec)
  const user = useUserStore((state) => state.user)
  const nickValues = useValuesStore(selectNickValues)
  const valuesLoaded = useValuesStore((state) => state.valuesLoaded)

  useEffect(() => {
    const unsubscribe = subscribeLastRec()
    return () => {
      unsubscribe()
    }
  }, [subscribeLastRec])

  // `values` starts empty, so `isEmpty(nickValues)` is also true mid-fetch. Only treat it as
  // "no photos" once `fetchValues` has settled, otherwise the empty state flashes on every load.
  const hasNoPhotos = valuesLoaded && isEmpty(nickValues)

  const bgFullUrl = useMemo(() => {
    if (!lastRecord) return ''
    return lastRecord.kind === 'video' ? getYouTubeMaxResUrl(lastRecord.url) : lastRecord.url
  }, [lastRecord])

  // The square crop the server trigger writes (videos carry their YouTube still): a few KB, so
  // it paints long before the full-size original, which is layered on top of it.
  const bgThumbUrl = useMemo(() => lastRecord?.thumb || '', [lastRecord])

  const bgStyle = useMemo<React.CSSProperties>(() => {
    if (!bgFullUrl || hasNoPhotos) {
      return {
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
      }
    }
    // Layer order is top-first: the full-size image covers the thumbnail once it decodes.
    const layers = bgThumbUrl ? [bgFullUrl, bgThumbUrl] : [bgFullUrl]
    return {
      backgroundImage: layers.map((url) => `url(${url})`).join(', '),
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: layers.map(() => 'cover').join(', '),
    }
  }, [bgFullUrl, bgThumbUrl, hasNoPhotos])

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-light-page dark:bg-dark-page">
      {/* Left half: hero image or empty state */}
      {hasNoPhotos ? (
        <div className="relative flex flex-col justify-center items-center md:w-1/2 min-h-[50vh] md:min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800">
          <div
            className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none"
            style={bgStyle}
          />
          <div className="relative z-10 text-center max-w-xs px-6 text-sm text-gray-600 dark:text-gray-300">
            There are no photos posted yet...
            <br />
            To add some you need to sign-in with your Google account. Only authorized users can add,
            delete or edit photos.
            {canContribute(user) && (
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
              className="absolute inset-0 bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
              style={bgStyle}
            />
          </Link>

          {/* Add photos button */}
          {canContribute(user) && (
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
