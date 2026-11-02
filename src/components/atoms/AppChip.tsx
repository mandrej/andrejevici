import React from 'react'
import AppIcon from '@/components/atoms/AppIcon'

export const APP_CHIP_VARIANTS = [
  'neutral',
  'primary',
  'kind',
  'tag',
  'date',
  'model',
  'lens',
  'nick',
] as const

export type AppChipVariant = (typeof APP_CHIP_VARIANTS)[number]

interface AppChipProps {
  label: React.ReactNode
  variant?: AppChipVariant
  size?: 'sm' | 'md'
  onClick?: () => void
  onRemove?: () => void
  title?: string
  className?: string
}

/**
 * Pill used by GlobalSearch filters, HomePage quick filters and tags fields.
 * Renders as a button when it is clickable or removable, otherwise as a span.
 * A chip is a single button, so the trailing ✕ is an icon inside it rather
 * than a nested button (nested buttons are invalid HTML).
 */
export const AppChip: React.FC<AppChipProps> = ({
  label,
  variant = 'neutral',
  size = 'sm',
  onClick,
  onRemove,
  title,
  className = '',
}) => {
  const actionable = Boolean(onClick || onRemove)
  const labelText = typeof label === 'string' || typeof label === 'number' ? String(label) : ''

  const classes = [
    'chip',
    `chip-${variant}`,
    size === 'md' ? 'chip-md' : '',
    actionable ? 'chip-action' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <span>{label}</span>
      {onRemove && <AppIcon name="close" className="chip-remove" aria-hidden="true" />}
    </>
  )

  if (actionable) {
    return (
      <button
        type="button"
        className={classes}
        title={title}
        aria-label={onRemove && labelText ? `Remove ${labelText}` : undefined}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
          onRemove?.()
        }}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={classes} title={title}>
      {content}
    </span>
  )
}

export default AppChip
