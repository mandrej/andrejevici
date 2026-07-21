import React from 'react'

interface AppBadgeProps {
  color?: 'primary' | 'secondary' | 'warning' | 'negative' | 'positive' | 'accent' | 'grey' | string
  textColor?:
    | 'primary'
    | 'secondary'
    | 'warning'
    | 'negative'
    | 'positive'
    | 'accent'
    | 'grey'
    | 'white'
    | 'black'
    | 'dark'
    | string
  size?: 'xs' | 'sm' | 'md'
  children?: React.ReactNode
  className?: string
}

const bgMap: Record<string, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  warning: 'bg-warning',
  negative: 'bg-negative',
  positive: 'bg-positive',
  accent: 'bg-accent',
  grey: 'bg-gray-500',
}

const textMap: Record<string, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  warning: 'text-gray-900',
  negative: 'text-white',
  positive: 'text-white',
  accent: 'text-white',
  grey: 'text-white',
  white: 'text-white',
  black: 'text-gray-900',
  dark: 'text-gray-900',
}

const sizeMap = {
  xs: 'text-xs px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  color = 'primary',
  textColor,
  size = 'sm',
  children,
  className = '',
}) => {
  const bgClass = bgMap[color] ?? 'bg-gray-100 dark:bg-gray-700'
  const textColorClass = textColor
    ? (textMap[textColor] ?? `text-${textColor}`)
    : (textMap[color] ?? 'text-gray-800 dark:text-gray-200')
  const sizeClass = sizeMap[size]

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${sizeClass} ${bgClass} ${textColorClass} ${className}`}
    >
      {children}
    </span>
  )
}

export default AppBadge
