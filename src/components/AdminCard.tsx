import React from 'react'
import AppIcon from '@/components/atoms/AppIcon'

interface AdminCardProps {
  icon: string
  title: string
  description: string
  color?: string
  details?: React.ReactNode
  action?: React.ReactNode
}

export const AdminCard: React.FC<AdminCardProps> = ({
  icon,
  title,
  description,
  color = 'primary',
  details,
  action,
}) => {
  return (
    <div className="flex flex-col h-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <AppIcon name={icon} className={`w-5 h-5 text-${color}`} />
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>
        </div>
      </div>

      {/* Details slot */}
      <div className="flex-1 p-3">{details}</div>

      {/* Action slot */}
      <div className="flex justify-end p-3 border-t border-gray-200 dark:border-gray-700">
        {action}
      </div>
    </div>
  )
}

export default AdminCard
