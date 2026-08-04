'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { ThemeProvider } from 'next-themes'

const AppInitializer = dynamic(() => import('@/app/AppInitializer'), { ssr: false })
const AppToast = dynamic(() => import('@/components/atoms/AppToast'), { ssr: false })

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppInitializer>
        {children}
        <AppToast />
      </AppInitializer>
    </ThemeProvider>
  )
}
