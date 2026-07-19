'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useUserStore } from '../../stores/userStore'
import { U, dummy, formatDatum, getYouTubeId } from '../../helpers'
import { logAnalyticsEvent } from '../../firebase'
import notify from '../../helpers/notify'
import type { PhotoType } from '../../helpers/models'
import Lightbox, { IconButton } from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import AppIcon from '../atoms/AppIcon'

interface SwiperViewProps {
  index: number
  onCarouselCancel: (hash: string | null) => void
}

const ShareIcon: React.FC = (props) => <AppIcon name="share" className="w-6 h-6" {...props} />

const DownloadIcon: React.FC = (props) => <AppIcon name="download" className="w-6 h-6" {...props} />

const PrevIcon: React.FC = (props) => <AppIcon name="chevron_left" className="w-8 h-8" {...props} />

const NextIcon: React.FC = (props) => (
  <AppIcon name="chevron_right" className="w-8 h-8" {...props} />
)

export const SwiperView: React.FC<SwiperViewProps> = ({ index, onCarouselCancel }) => {
  const objects = useAppStore((state) => state.objects)
  const setShowCarousel = useAppStore((state) => state.setShowCarousel)
  const user = useUserStore((state) => state.user)

  const [currentIndex, setCurrentIndex] = useState(index)
  const zoomRef = useRef<any>(null)

  const getCaption = (rec: PhotoType, showExtra: boolean): string => {
    if (rec.kind === 'video') return rec.headline || ''

    let tmp = ''
    const { headline, aperture, shutter, iso, model, lens } = rec
    tmp += (headline || '') + '<br/>'
    tmp += aperture ? ' f' + aperture : ''
    tmp += shutter ? ' ' + shutter + 's' : ''
    tmp += iso ? ' ' + iso + ' ASA' : ''
    if (showExtra) {
      tmp += model ? ' ' + model : ''
      tmp += lens ? ' ' + lens : ''
    }
    return tmp
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
    const hash = U + obj.filename
    const url = window.location.origin + window.location.pathname + (hash ? '#' + hash : '')

    try {
      await navigator.clipboard.writeText(url)
      notify({ type: 'positive', message: 'URL copied to clipboard', icon: 'sym_r_check' })
      logAnalyticsEvent('share', {
        when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
        who: user?.email ? dummy(user.email) : 'anonymous',
        filename: obj.filename,
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
        filename: curr.filename,
        headline: curr.headline,
      })

      const download = async () => {
        try {
          const response = await fetch(curr.url)
          const blob = await response.blob()
          const blobUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = curr.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(blobUrl)
        } catch (e) {
          console.error('Download failed, falling back to direct link:', e)
          const a = document.createElement('a')
          a.href = curr.url
          a.target = '_blank'
          a.download = curr.filename
          a.click()
        }
      }
      void download()
    }
  }

  const handleClose = () => {
    zoomRef.current?.changeZoom(1)
    const curr = objects[currentIndex]
    const hash = curr ? U + curr.filename : null
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

    return () => {
      document.body.classList.remove('swiper-view-active')
      window.removeEventListener('contextmenu', preventDefault)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [onCarouselCancel])

  const currentSlide = slides[currentIndex]
  const isImage = currentSlide?.type === 'image'

  const toolbarButtons = useMemo(() => {
    const buttons: React.ReactNode[] = []

    if (isImage) {
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

    return buttons
  }, [isImage, currentIndex, handleShare, handleDownload])

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
          buttons: toolbarButtons,
        }}
        on={{
          view: ({ index: newIndex }: { index: number }) => {
            zoomRef.current?.changeZoom(1) // Reset zoom when changing slides
            setCurrentIndex(newIndex)
          },
        }}
        close={handleClose}
        render={{
          iconPrev: () => <PrevIcon />,
          iconNext: () => <NextIcon />,
          slideHeader: ({ slide }: { slide: any }) => {
            const obj = slide.obj as PhotoType
            if (!obj) return null
            return (
              <div className="absolute top-0 left-0 w-full bg-black/50 text-white py-2 px-4 z-2000 flex items-center min-h-[44px]">
                <div className="flex-1 text-center overflow-hidden text-ellipsis whitespace-nowrap px-10">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: getCaption(
                        obj,
                        typeof window !== 'undefined' ? window.innerWidth > 600 : true,
                      ),
                    }}
                  />
                </div>
                <button
                  className="absolute right-4 text-white/80 hover:text-white transition-colors flex items-center justify-center p-1"
                  onClick={handleClose}
                  aria-label="Close"
                >
                  <AppIcon name="close" className="w-6 h-6" />
                </button>
              </div>
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
        `,
        }}
      />
    </>
  )
}

export default SwiperView
