'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const AppInitializer = dynamic(() => import('./AppInitializer'), { ssr: false })
const AppToast = dynamic(() => import('../components/atoms/AppToast'), { ssr: false })

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppInitializer>
      {children}
      <AppToast />
    </AppInitializer>
  )
}
