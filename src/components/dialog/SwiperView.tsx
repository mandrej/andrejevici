'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useUserStore } from '@/stores/userStore'
import { U, dummy, formatDatum, getYouTubeId } from '@/helpers'
import { logAnalyticsEvent } from '@/firebase'
import notify from '@/helpers/notify'
import type { PhotoType } from '@/helpers/models'
import Lightbox, { IconButton } from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import AppIcon from '@/components/atoms/AppIcon'
import PhotoInfo from '@/components/dialog/PhotoInfo'

interface SwiperViewProps {
  index: number
  onCarouselCancel: (hash: string | null) => void
}

const ShareIcon: React.FC = (props) => <AppIcon name="share" className="w-6 h-6" {...props} />

const DownloadIcon: React.FC = (props) => <AppIcon name="download" className="w-6 h-6" {...props} />

const InfoIcon: React.FC = (props) => <AppIcon name="info" className="w-6 h-6" {...props} />

const PrevIcon: React.FC = (props) => <AppIcon name="chevron_left" className="w-8 h-8" {...props} />

const NextIcon: React.FC = (props) => (
  <AppIcon name="chevron_right" className="w-8 h-8" {...props} />
)

export const SwiperView: React.FC<SwiperViewProps> = ({ index, onCarouselCancel }) => {
  const objects = useAppStore((state) => state.objects)
  const setShowCarousel = useAppStore((state) => state.setShowCarousel)
  const user = useUserStore((state) => state.user)

  const [currentIndex, setCurrentIndex] = useState(index)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const zoomRef = useRef<any>(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen().catch((err) => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`)
      })
    }
  }

  const slides = useMemo(() => {
    return objects.map((obj) => {
      if (obj.kind === 'video') {
        const id = getYouTubeId(obj.url)
        return {
          type: 'video' as const,
          src: `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&iv_load_policy=3&controls=0&playlist=${id}&loop=1&enablejsapi=1`,
          obj: obj,
        }
      }
      const w = obj.dim ? obj.dim[0] : 0
      const h = obj.dim ? obj.dim[1] : 0
      return {
        type: 'image' as const,
        src: obj.url,
        width: w,
        height: h,
        alt: obj.headline || '',
        obj: obj,
      }
    })
  }, [objects])

  const handleShare = async () => {
    const obj = objects[currentIndex]
    if (!obj) return
    const hash = U + obj.id
    const url = window.location.origin + window.location.pathname + (hash ? '#' + hash : '')

    try {
      await navigator.clipboard.writeText(url)
      notify({ type: 'positive', message: 'URL copied to clipboard', icon: 'sym_r_check' })
      logAnalyticsEvent('share', {
        when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
        who: user?.email ? dummy(user.email) : 'anonymous',
        filename: obj.id,
        headline: obj.headline || '',
        kind: obj.kind || 'photo',
      })
    } catch (e) {
      console.error('Share error:', e)
      notify({ type: 'warning', message: 'Unable to copy URL to clipboard' })
    }
  }

  const handleDownload = () => {
    const curr = objects[currentIndex]
    if (curr && curr.kind !== 'video') {
      logAnalyticsEvent('image_download', {
        when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
        who: user?.email ? dummy(user.email) : 'anonymous',
        filename: curr.id,
        headline: curr.headline,
      })

      const download = async () => {
        try {
          const response = await fetch(curr.url)
          const blob = await response.blob()
          const blobUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = curr.id
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(blobUrl)
        } catch (e) {
          console.error('Download failed, falling back to direct link:', e)
          const a = document.createElement('a')
          a.href = curr.url
          a.target = '_blank'
          a.download = curr.id
          a.click()
        }
      }
      void download()
    }
  }

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    zoomRef.current?.changeZoom(1)
    const curr = objects[currentIndex]
    const hash = curr ? U + curr.id : null
    onCarouselCancel(hash)
    setShowCarousel(false)
  }

  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault()
    document.body.classList.add('swiper-view-active')
    window.addEventListener('contextmenu', preventDefault)

    const handlePopState = () => {
      onCarouselCancel(null)
    }
    window.addEventListener('popstate', handlePopState)

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.body.classList.remove('swiper-view-active')
      window.removeEventListener('contextmenu', preventDefault)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [onCarouselCancel])

  const currentSlide = slides[currentIndex]
  const isImage = currentSlide?.type === 'image'

  const FullscreenIcon: React.FC<any> = useMemo(
    () => (props: any) => (
      <AppIcon
        name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
        className="w-6 h-6"
        {...props}
      />
    ),
    [isFullscreen],
  )

  const toolbarButtons = useMemo(() => {
    const buttons: React.ReactNode[] = []

    if (isImage) {
      buttons.push(
        <IconButton
          key="info"
          label={'Info' as any}
          icon={InfoIcon}
          onClick={() => setShowInfo((prev) => !prev)}
        />,
      )
      buttons.push(
        <IconButton key="share" label={'Share' as any} icon={ShareIcon} onClick={handleShare} />,
      )
      buttons.push(
        <IconButton
          key="download"
          label={'Download' as any}
          icon={DownloadIcon}
          onClick={handleDownload}
        />,
      )
    }

    buttons.push(
      <IconButton
        key="fullscreen"
        label={(isFullscreen ? 'Exit Fullscreen' : 'Fullscreen') as any}
        icon={FullscreenIcon}
        onClick={toggleFullscreen}
      />,
    )

    return buttons
  }, [isImage, isFullscreen, FullscreenIcon, handleShare, handleDownload])

  return (
    <>
      <Lightbox
        open={true}
        index={currentIndex}
        slides={slides as any}
        plugins={[Zoom]}
        zoom={{ ref: zoomRef }}
        carousel={{ padding: 0 }}
        toolbar={{
          buttons: isFullscreen ? [] : toolbarButtons,
        }}
        on={{
          view: ({ index: newIndex }: { index: number }) => {
            zoomRef.current?.changeZoom(1) // Reset zoom when changing slides
            setCurrentIndex(newIndex)
          },
        }}
        close={handleClose}
        render={{
          buttonZoom: () => null,
          iconPrev: () => <PrevIcon />,
          iconNext: () => <NextIcon />,
          ...(isFullscreen
            ? {
                buttonPrev: () => null,
                buttonNext: () => null,
              }
            : {}),
          controls: () => (
            <>
              {showInfo && !isFullscreen && isImage && currentSlide?.obj && (
                <PhotoInfo photo={currentSlide.obj} onClose={() => setShowInfo(false)} />
              )}
            </>
          ),
          slideHeader: ({ slide }: { slide: any }) => {
            if (isFullscreen) return null
            const obj = slide.obj as PhotoType
            if (!obj) return null
            const isVideo = slide.type === 'video' || obj.kind === 'video'
            return (
              <>
                {!isVideo && obj.headline && (
                  <div className="absolute top-0 left-0 w-full bg-black/50 text-white py-2 px-14 z-2000 flex items-center justify-center min-h-11">
                    <div className="text-center overflow-hidden text-ellipsis whitespace-nowrap font-medium text-sm sm:text-base">
                      {obj.headline}
                    </div>
                  </div>
                )}
                <button
                  className="absolute top-2 right-4 z-2000 text-white/80 hover:text-white transition-colors flex items-center justify-center p-1"
                  onClick={handleClose}
                  aria-label="Close"
                >
                  <AppIcon name="close" className="w-6 h-6" />
                </button>
              </>
            )
          },
          slide: ({ slide }: { slide: any }) => {
            if (slide.type === 'video') {
              return (
                <div className="video-wrapper w-full h-full flex items-center justify-center">
                  <iframe
                    src={slide.src}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full aspect-video"
                  />
                </div>
              )
            }
            return undefined // use default image rendering
          },
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .yarl__slide_image {
            -webkit-transform: none !important;
          }
          .video-wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            max-width: 100vw;
            max-height: 100vh;
            aspect-ratio: 16/9;
          }
          .video-wrapper iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          .swiper-view-active img {
            -webkit-touch-callout: none !important;
            user-select: none !important;
          }
          .yarl__toolbar {
            top: auto !important;
            bottom: 24px !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            display: none !important;
            justify-content: center !important;
            gap: 12px !important;
            padding: 4px 16px !important;
            background-color: rgba(0, 0, 0, 0.45) !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            border-radius: 9999px !important;
          }
          .yarl__toolbar:has(.yarl__button) {
            display: flex !important;
          }
          .yarl__toolbar .yarl__button {
            filter: none !important;
            padding: 8px !important;
          }
          .yarl__navigation_prev,
          .yarl__navigation_next {
            display: flex !important;
            color: rgba(255, 255, 255, 0.85) !important;
            background: transparent !important;
            background-color: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border: none !important;
            filter: none !important;
            box-shadow: none !important;
            padding: 8px !important;
            z-index: 2000 !important;
          }
          .yarl__navigation_prev:hover,
          .yarl__navigation_next:hover {
            color: rgba(255, 255, 255, 1) !important;
            background: transparent !important;
            background-color: transparent !important;
            border-color: transparent !important;
          }
          .yarl__navigation_prev {
            left: 16px !important;
          }
          .yarl__navigation_next {
            right: 16px !important;
          }
          ${
            isFullscreen
              ? `
          .yarl__toolbar,
          .yarl__navigation_prev,
          .yarl__navigation_next,
          .yarl__button,
          .yarl__controls {
            display: none !important;
          }
          `
              : ''
          }
        `,
        }}
      />
    </>
  )
}

export default SwiperView
