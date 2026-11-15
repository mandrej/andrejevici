'use client'

import { useUserStore } from '@/stores/userStore'
import { canContribute } from '@/helpers'
import MenuLink from '@/components/MenuLink'
import ThemeToggle from '@/components/atoms/ThemeToggle'

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

      {canContribute(user) && (
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

      <div className="flex items-center py-1">
        {/* Empty icon slot: keeps the theme buttons aligned with the MenuLink titles */}
        <div className="shrink-0 w-10 h-10 mx-1" aria-hidden="true" />
        <ThemeToggle showLabels={true} />
      </div>
    </nav>
  )
}

export default Menu
