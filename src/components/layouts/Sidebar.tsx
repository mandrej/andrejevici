'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Menu from '@/components/Menu'
import ManageSelection from '@/components/ManageSelection'
import SendMessage from '@/components/SendMessage'
import ThemeToggle from '@/components/atoms/ThemeToggle'
import { useUserStore } from '@/stores/userStore'

interface SidebarProps {
  onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const pathname = usePathname()
  const user = useUserStore((state) => state.user)

  return (
    <div className="flex flex-col h-full mt-4">
      <Menu onLinkClick={onCloseMobile} />
      <div className="grow"></div>
      {user && pathname === '/list' && <ManageSelection />}
      {user && (pathname === '/admin' || pathname === '/add') && <SendMessage />}
      {user && (
        <div className="flex justify-end p-2">
          <ThemeToggle showLabels={true} />
        </div>
      )}
    </div>
  )
}

export default Sidebar
