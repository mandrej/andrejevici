'use client'

import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import AppIcon from '@/components/atoms/AppIcon'

interface ThemeToggleProps {
  className?: string
  showLabels?: boolean | 'always'
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabels = true }) => {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const themeOptions = [
    { value: 'light', icon: 'light_mode', label: 'Light' },
    { value: 'dark', icon: 'dark_mode', label: 'Dark' },
    { value: 'system', icon: 'brightness_6', label: 'Auto' },
  ] as const

  const getLabelClass = () => {
    if (showLabels === 'always') return 'inline'
    if (showLabels) return 'hidden xs:inline'
    return 'hidden'
  }

  return (
    <div
      className={`inline-flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm ${className}`}
    >
      {themeOptions.map((opt) => {
        const isActive =
          mounted && (theme === opt.value || (opt.value === 'system' && theme === 'auto'))
        return (
          <button
            key={opt.value}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 transition-colors text-xs font-medium ${
              isActive
                ? 'bg-primary text-white font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={`Theme: ${opt.label}`}
            onClick={() => setTheme(opt.value)}
          >
            <AppIcon name={opt.icon} className="w-4 h-4" />
            <span className={getLabelClass()}>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ThemeToggle
