import React from 'react'

interface AppProgressProps {
  value?: number
  indeterminate?: boolean
  color?: 'primary' | 'secondary' | 'warning' | 'negative' | 'positive' | 'info' | 'accent' | string
  height?: number
  className?: string
}

const colorMap: Record<string, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  warning: 'bg-warning',
  negative: 'bg-negative',
  positive: 'bg-positive',
  info: 'bg-info',
  accent: 'bg-accent',
}

export const AppProgress: React.FC<AppProgressProps> = ({
  value = 0,
  indeterminate = false,
  color = 'primary',
  height = 3,
  className = '',
}) => {
  const colorClass = colorMap[color] ?? 'bg-primary'

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height: `${height}px` }}
    >
      {indeterminate ? (
        <div
          className={`absolute inset-y-0 rounded-full ${colorClass}`}
          style={{
            width: '30%',
            animation: 'progress-indeterminate 1.5s linear infinite',
          }}
        />
      ) : (
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${Math.min(Math.max(value * 100, 0), 100)}%` }}
        />
      )}

      {/* Embedded style tag to define the indeterminate animation keyframe */}
      {indeterminate && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes progress-indeterminate {
                0% {
                  transform: translateX(-100%) scaleX(1);
                }
                50% {
                  transform: translateX(100%) scaleX(1.5);
                }
                100% {
                  transform: translateX(300%) scaleX(1);
                }
              }
            `,
          }}
        />
      )}
    </div>
  )
}

export default AppProgress
