import React from 'react'
import AppBanner from '@/components/atoms/AppBanner'
import AppIcon from '@/components/atoms/AppIcon'

interface ErrorBannerProps {
  inquiry: boolean
  title?: React.ReactNode
  detail?: React.ReactNode
  children?: React.ReactNode
}

const renderWithLinks = (content: React.ReactNode): React.ReactNode => {
  if (typeof content !== 'string') return content

  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = content.split(urlRegex)

  return parts.map((part, i) => {
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold hover:opacity-80 break-all text-blue-600 dark:text-blue-400"
        >
          {part}
        </a>
      )
    }
    return part
  })
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ inquiry, title, detail, children }) => {
  if (!inquiry) return null

  return (
    <AppBanner
      color="warning"
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-md max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] overflow-y-auto text-center z-100 rounded-xl shadow-lg"
    >
      <div className="flex flex-col items-center gap-2 w-full">
        <AppIcon name="sym_r_error_outline" className="w-16 h-16 shrink-0" />
        {title && <div className="text-xl font-bold wrap-break-word break-all w-full">{title}</div>}
        {detail && (
          <div className="w-full max-h-60 overflow-y-auto break-all wrap-anywhere whitespace-pre-wrap text-sm text-center px-1 font-normal select-text">
            {renderWithLinks(detail)}
          </div>
        )}
        {children}
      </div>
    </AppBanner>
  )
}

export default ErrorBanner
