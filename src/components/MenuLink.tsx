'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AppIcon from '@/components/atoms/AppIcon'

interface MenuLinkProps {
  to: string
  icon: string
  title: string
  subtitle?: string
  onClick?: () => void
}

export const MenuLink: React.FC<MenuLinkProps> = ({ to, icon, title, subtitle, onClick }) => {
  const pathname = usePathname()
  const isActive = pathname === to

  return (
    <Link
      href={to}
      onClick={onClick}
      className={`flex items-center py-2 rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <div className="shrink-0 w-10 h-10 flex items-center justify-center mx-1">
        <AppIcon name={icon} className="w-6 h-6" />
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-sm">{title}</span>
        {subtitle && <span className="text-xs">{subtitle}</span>}
      </div>
    </Link>
  )
}

export default MenuLink
