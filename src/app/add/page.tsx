'use client'

import React, { useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAppStore } from '../../stores/appStore'
import { useUserStore } from '../../stores/userStore'

const AddPhotoPageContent = dynamic(() => import('./AddPhotoPageContent'), { ssr: false })
const AddVideoPageContent = dynamic(() => import('./AddVideoPageContent'), { ssr: false })

export default function AddPage() {
  const router = useRouter()
  const addTab = useAppStore((state) => state.addTab)
  const user = useUserStore((state) => state.user)
  const initialized = useUserStore((state) => state.initialized)

  const canAddPhoto = useMemo(() => {
    return !!user?.isAuthorized && !!user?.nick
  }, [user])

  useEffect(() => {
    if (initialized && !canAddPhoto) {
      router.replace('/401')
    }
  }, [initialized, canAddPhoto, router])

  if (!initialized || !canAddPhoto) {
    return null
  }

  return addTab === 'photo' ? <AddPhotoPageContent /> : <AddVideoPageContent />
}
