'use client'

import React from 'react'
import { useUserStore } from '@/stores/userStore'
import MenuLink from '@/components/MenuLink'

interface MenuProps {
  onLinkClick?: () => void
}

export const Menu: React.FC<MenuProps> = ({ onLinkClick }) => {
  const user = useUserStore((state) => state.user)

  return (
    <nav className="mt-2 px-2 space-y-1">
      <MenuLink to="/" icon="sym_r_home" title="Start" onClick={onLinkClick} />

      <MenuLink
        to="/list"
        icon="sym_r_grid_view"
        title="Browse"
        subtitle="You can filter results"
        onClick={onLinkClick}
      />

      {user && user.isAuthorized && user.nick && (
        <MenuLink
          to="/add"
          icon="sym_r_add_a_photo"
          title="Add"
          subtitle="jpeg images less then 5 Mb"
          onClick={onLinkClick}
        />
      )}

      {user && user.isAdmin && (
        <MenuLink
          to="/admin"
          icon="sym_r_settings"
          title="Admin"
          subtitle="rebuild, repair, tags, subscribers"
          onClick={onLinkClick}
        />
      )}
    </nav>
  )
}

export default Menu
