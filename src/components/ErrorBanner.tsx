import React from 'react'
import AppBanner from './atoms/AppBanner'
import AppIcon from './atoms/AppIcon'

interface ErrorBannerProps {
  inquiry: boolean
  title?: React.ReactNode
  detail?: React.ReactNode
  children?: React.ReactNode
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ inquiry, title, detail, children }) => {
  if (!inquiry) return null

  return (
    <AppBanner
      color="warning"
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 max-w-[calc(100vw-2rem)] text-center z-100 rounded-xl shadow-lg"
    >
      <div className="flex flex-col items-center gap-2">
        <AppIcon name="sym_r_error_outline" className="w-16 h-16" />
        {title && <div className="text-xl font-bold">{title}</div>}
        {detail && <div>{detail}</div>}
        {children}
      </div>
    </AppBanner>
  )
}

export default ErrorBanner
