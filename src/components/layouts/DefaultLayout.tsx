import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AppIcon from '../atoms/AppIcon'
import AppDialog from '../atoms/AppDialog'
import AppButton from '../atoms/AppButton'
import AppProgress from '../atoms/AppProgress'
import { useScreen } from '../../composables/useScreen'
import { useUserStore } from '../../stores/userStore'
import Sidebar from '../sidebar/Sidebar'

// Dynamic Toolbar imports based on route
import ListToolbar from '../toolbar/ListToolbar'
import AddToolbar from '../toolbar/AddToolbar'
import AdminToolbar from '../toolbar/AdminToolbar'

interface DefaultLayoutProps {
  children: React.ReactNode
}

export const DefaultLayout: React.FC<DefaultLayoutProps> = ({ children }) => {
  const pathname = usePathname()
  const { askPush, enableNotifications, disableNotifications } = useUserStore()
  const screen = useScreen()

  const [drawer, setDrawer] = useState(false)
  const [wait, setWait] = useState(false)
  const [showConsent, setShowConsent] = useState(false)

  const isDesktop = screen.gtSm

  // Automatically close drawer when transitioning to desktop screen size
  useEffect(() => {
    if (isDesktop) {
      setDrawer(false)
    }
  }, [isDesktop])

  // Track the askPush state from userStore to display the notification consent dialog
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setShowConsent(askPush)
    }
  }, [askPush])

  const onEnable = async () => {
    setWait(true)
    await enableNotifications()
    setWait(false)
    setShowConsent(false)
  }

  const onDisable = async () => {
    setWait(true)
    await disableNotifications()
    setWait(false)
    setShowConsent(false)
  }

  // Determine which toolbar to render based on path
  const renderToolbar = () => {
    if (pathname === '/list') return <ListToolbar />
    if (pathname === '/add') return <AddToolbar />
    if (pathname === '/admin') return <AdminToolbar />
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-light-page dark:bg-dark-page">
      {/* Sidebar (desktop always visible, mobile overlay) */}
      <aside
        className={`shrink-0 flex flex-col h-full transition-transform duration-300 z-40 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 w-80 fixed min-[769px]:relative ${
          drawer || isDesktop ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onCloseMobile={() => setDrawer(false)} />
      </aside>

      {/* Mobile backdrop */}
      {drawer && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/40 z-30 min-[769px]:hidden transition-opacity duration-300"
          onClick={() => setDrawer(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header toolbar */}
        <header className="shrink-0 relative flex items-center h-14 px-4 gap-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm z-20">
          {/* Hamburger (mobile) or close (mobile open) */}
          <button
            className="shrink-0 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={drawer ? 'Close menu' : 'Open menu'}
            onClick={() => setDrawer(!drawer)}
          >
            <AppIcon name={drawer && !isDesktop ? 'close' : 'menu'} className="w-6 h-6" />
          </button>

          {/* Page-specific toolbar */}
          {renderToolbar()}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Push notification consent dialog */}
      <AppDialog modelValue={showConsent} persistent maxWidth="max-w-sm" onChange={setShowConsent}>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Accept notifications</h2>
          {wait && <AppProgress indeterminate color="warning" className="mb-3" />}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Would you like to enable push notifications?
          </p>
          <div className="flex justify-between gap-3">
            <AppButton flat label="Disable" disabled={wait} onClick={onDisable} />
            <AppButton color="primary" label="Enable" disabled={wait} onClick={onEnable} />
          </div>
        </div>
      </AppDialog>
    </div>
  )
}

export default DefaultLayout
