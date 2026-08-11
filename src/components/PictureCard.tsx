import React, { useState, useMemo } from 'react'
import { U, formatDatum, openMaps } from '@/helpers'
import type { PhotoType } from '@/helpers/models'
import { useAppStore } from '@/stores/appStore'
import FileBroken from '@/components/FileBroken'
import AppIcon from '@/components/atoms/AppIcon'

interface PictureCardProps {
  rec: PhotoType
  onCarouselShow?: (id: string) => void
  action?: React.ReactNode
}

export const PictureCard: React.FC<PictureCardProps> = ({ rec, onCarouselShow, action }) => {
  const searchBy = useAppStore((state) => state.searchBy)
  const [imgError, setImgError] = useState(false)

  const thumbUrl = useMemo(() => {
    return rec.thumb || rec.url
  }, [rec.thumb, rec.url])

  const isPublished = useMemo(() => {
    return (rec.kind === 'photo' && rec.thumb) || rec.kind === 'video'
  }, [rec.kind, rec.thumb])

  if (isPublished) {
    return (
      <div id={U + rec.id} className="card group">
        {/* Thumbnail image with aspect ratio */}
        <div className="relative w-full overflow-hidden" style={{ paddingTop: '75%' }}>
          <img
            loading="lazy"
            src={thumbUrl}
            alt={rec.headline || rec.id}
            className="absolute inset-0 w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
            onClick={() => onCarouselShow && onCarouselShow(rec.id)}
            onError={() => setImgError(true)}
          />
          {/* Broken image */}
          {imgError && <FileBroken />}
          {/* Video play overlay */}
          {rec.kind === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <AppIcon name="play_circle" className="w-16 h-16 text-white/60 drop-shadow-lg" />
            </div>
          )}
        </div>

        {/* Action slot (edit button, checkbox) */}
        {action}

        {/* Caption */}
        <div className="px-3 py-1 text-sm font-medium truncate text-gray-900 dark:text-gray-100">
          {rec.headline}
        </div>
        <div className="flex items-center justify-between px-3 pb-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            <a
              href="#"
              className="link hover:text-secondary/80 transition-colors"
              onClick={(e) => {
                e.preventDefault()
                searchBy({ nick: rec.nick })
              }}
            >
              {rec.nick}
            </a>
            {', '}
            <a
              href="#"
              className="link hover:text-primary transition-colors"
              onClick={(e) => {
                e.preventDefault()
                searchBy({ year: rec.year, month: rec.month, day: rec.day })
              }}
            >
              {rec.date ? formatDatum(rec.date, 'DD.MM.YYYY HH:mm') : ''}
            </a>
          </span>
          {rec.loc && (
            <button
              className="hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                openMaps(rec.loc!)
              }}
            >
              <AppIcon name="my_location" className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Unpublished (upload queue) card
  return (
    <div id={U + rec.id} className="card">
      <div className="relative w-full overflow-hidden" style={{ paddingTop: '80%' }}>
        <img
          loading="lazy"
          src={rec.url}
          alt={rec.id}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        {imgError && <FileBroken />}
      </div>
      {action}
    </div>
  )
}

export default PictureCard
