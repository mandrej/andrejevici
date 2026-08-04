'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Menu from '@/components/sidebar/Menu'
import ManageSelection from '@/components/sidebar/ManageSelection'
import SendMessage from '@/components/sidebar/SendMessage'

interface SidebarProps {
  onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full mt-4">
      <Menu onLinkClick={onCloseMobile} />
      <div className="grow"></div>
      {pathname === '/list' && <ManageSelection />}
      {(pathname === '/admin' || pathname === '/add') && <SendMessage />}
    </div>
  )
}

export default Sidebar
