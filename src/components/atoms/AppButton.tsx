import React from 'react'
import Link from 'next/link'
import AppIcon from './AppIcon'

interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  icon?: string
  color?:
    | 'primary'
    | 'secondary'
    | 'warning'
    | 'negative'
    | 'positive'
    | 'accent'
    | 'default'
    | string
  flat?: boolean
  round?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  to?: string | Record<string, unknown>
  href?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'text-xs px-2.5 py-1',
  md: 'text-sm px-3.5 py-1.5',
  lg: 'text-base px-5 py-2.5',
}

const colorMap: Record<string, { solid: string; flat: string }> = {
  primary: {
    solid: 'bg-primary text-white hover:bg-primary/90',
    flat: 'text-primary hover:bg-primary/10',
  },
  secondary: {
    solid: 'bg-secondary text-black hover:bg-secondary/90',
    flat: 'text-teal-600 hover:bg-secondary/10',
  },
  warning: {
    solid: 'bg-warning text-black hover:bg-warning/90',
    flat: 'text-warning hover:bg-warning/10',
  },
  negative: {
    solid: 'bg-negative text-white hover:bg-negative/90',
    flat: 'text-negative hover:bg-negative/10',
  },
  positive: {
    solid: 'bg-positive text-white hover:bg-positive/90',
    flat: 'text-positive hover:bg-positive/10',
  },
  accent: {
    solid: 'bg-accent text-white hover:bg-accent/90',
    flat: 'text-accent hover:bg-accent/10',
  },
  default: {
    solid:
      'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600',
    flat: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
  },
}

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  icon,
  color = 'default',
  flat = false,
  round = false,
  disabled = false,
  type = 'button',
  to,
  href,
  size = 'md',
  onClick,
  className = '',
  children,
  ...props
}) => {
  const c = colorMap[color] ?? colorMap.default
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95'
  const shape = round ? 'rounded-full' : 'rounded-lg'
  const sizeCls = sizeMap[size]
  const variant = flat ? c.flat : c.solid
  const dis = disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'

  const classes = `${base} ${shape} ${sizeCls} ${variant} ${dis} ${className}`

  const iconElement = icon && (
    <AppIcon name={icon} className={`w-5 h-5 leading-none ${label ? 'mr-1.5' : ''}`} />
  )

  const content = (
    <>
      {iconElement}
      {label && <span>{label}</span>}
      {children}
    </>
  )

  // Polymorphic rendering
  const linkHref = to ? (typeof to === 'string' ? to : (to.path as string) || '/') : href

  if (linkHref) {
    // If it's an external link or anchor (starts with http, mailto, etc.)
    if (
      typeof linkHref === 'string' &&
      (linkHref.startsWith('http') || linkHref.startsWith('mailto:'))
    ) {
      return (
        <a href={linkHref} target="_blank" rel="noopener noreferrer" className={classes}>
          {content}
        </a>
      )
    }

    // Otherwise use Next.js Link
    return (
      <Link href={linkHref} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes} {...props}>
      {content}
    </button>
  )
}

export default AppButton
