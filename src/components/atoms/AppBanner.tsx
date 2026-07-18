import React from 'react'
import AppIcon from './AppIcon'

interface AppBannerProps {
  color?: 'primary' | 'secondary' | 'accent' | 'positive' | 'negative' | 'info' | 'warning' | 'grey' | string
  icon?: string
  children?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

const colorClasses: Record<string, string> = {
  primary: 'bg-blue-50 border-blue-500 text-blue-800',
  secondary: 'bg-teal-50 border-teal-500 text-teal-800',
  accent: 'bg-purple-50 border-purple-500 text-purple-800',
  positive: 'bg-green-50 border-green-500 text-green-800',
  negative: 'bg-red-50 border-red-500 text-red-800',
  info: 'bg-blue-100 border-blue-400 text-blue-900',
  warning: 'bg-orange-100 border-orange-500 text-orange-800',
  grey: 'bg-gray-100 border-gray-400 text-gray-700',
}

export const AppBanner: React.FC<AppBannerProps> = ({
  color = 'info',
  icon,
  children,
  actions,
  className = '',
}) => {
  const bgBorderTextClass = colorClasses[color] ?? 'bg-gray-100 border-gray-400 text-gray-800'

  return (
    <div
      className={`flex items-center p-4 rounded-lg transition-colors ${bgBorderTextClass} dark:bg-gray-800 dark:text-gray-200 ${className}`}
    >
      {icon && (
        <div className="shrink-0 mr-3">
          <AppIcon name={icon} className="w-6 h-6" />
        </div>
      )}
      <div className="grow">{children}</div>
      {children && actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}

export default AppBanner
