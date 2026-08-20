'use client'

import React from 'react'
import type { PhotoType } from '@/helpers/models'
import { formatBytes, formatDatum } from '@/helpers'
import AppIcon from '@/components/atoms/AppIcon'

interface PhotoInfoProps {
  photo: PhotoType
  onClose: () => void
}

export const PhotoInfo: React.FC<PhotoInfoProps> = ({ photo, onClose }) => {
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-2001 w-[90%] max-w-sm sm:max-w-md bg-black/75 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-white text-xs sm:text-sm shadow-2xl transition-all pointer-events-auto">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/15">
        <div className="font-semibold text-white/90 flex items-center gap-1.5">
          <AppIcon name="info" className="w-4 h-4 text-blue-400" />
          <span>Photo Info</span>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1">
          <AppIcon name="close" className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {/* Left Column: Date, Uploaded By, File Size, Dimensions */}
        <div className="space-y-2.5">
          {photo.date && (
            <div>
              <span className="text-white/50 block text-[10px] uppercase tracking-wider">Date</span>
              <span className="font-medium text-white/95">{formatDatum(photo.date)}</span>
            </div>
          )}
          {photo.nick && (
            <div>
              <span className="text-white/50 block text-[10px] uppercase tracking-wider">
                Uploaded By
              </span>
              <span className="font-medium text-white/95">@{photo.nick}</span>
            </div>
          )}
          {photo.size > 0 && (
            <div>
              <span className="text-white/50 block text-[10px] uppercase tracking-wider">
                File Size
              </span>
              <span className="font-medium text-white/95">{formatBytes(photo.size)}</span>
            </div>
          )}
          {photo.dim && (
            <div>
              <span className="text-white/50 block text-[10px] uppercase tracking-wider">
                Dimensions
              </span>
              <span className="font-medium text-white/95">
                {photo.dim[0]} × {photo.dim[1]}
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Aperture, Shutter, ISO, Camera, Lens, Focal */}
        <div className="space-y-2.5">
          {photo.aperture && (
            <div>
              <span className="text-white/50 block text-[10px] uppercase tracking-wider">
                Aperture
              </span>
              <span className="font-medium text-white/95">f/{photo.aperture}</span>
            </div>
          )}
          {photo.shutter && (
            <div>
              <span className="text-white/50 block text-[10px] uppercase tracking-wider">
                Shutter Speed
              </span>
              <span className="font-medium text-white/95">{photo.shutter}s</span>
            </div>
          )}
          {photo.iso && (
            <div>
              <span className="text-white/50 block text-[10px] uppercase tracking-wider">ISO</span>
              <span className="font-medium text-white/95">{photo.iso} ASA</span>
            </div>
          )}
          {photo.model && (
            <div>
              <span className="text-white/50 block text-[10px] uppercase tracking-wider">
                Camera
              </span>
              <span className="font-medium text-white/95 font-sans">{photo.model}</span>
            </div>
          )}
          {photo.lens && (
            <div>
              <span className="text-white/50 block text-[10px] uppercase tracking-wider">Lens</span>
              <span className="font-medium text-white/95 font-sans">{photo.lens}</span>
            </div>
          )}
          {(photo.focal_length || (photo as any).focalLength) && (
            <div>
              <span className="text-white/50 block text-[10px] uppercase tracking-wider">
                Focal Length
              </span>
              <span className="font-medium text-white/95">
                {photo.focal_length || (photo as any).focalLength}mm
              </span>
            </div>
          )}
        </div>
      </div>

      {photo.tags && photo.tags.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-white/15">
          <span className="text-white/50 block text-[10px] uppercase tracking-wider">Tags</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {photo.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] text-white/80"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoInfo
