'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { ThemeProvider } from 'next-themes'

// Renders nothing: it only wires up stores, auth, FCM and the service worker in effects.
// Dynamically imported so its client bundle never blocks the shell from rendering.
const AppInitializer = dynamic(() => import('@/app/AppInitializer').then((m) => m.AppInitializer))
const AppToast = dynamic(() => import('@/components/atoms/AppToast'))

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppInitializer>{children}</AppInitializer>
      <AppToast />
    </ThemeProvider>
  )
}
