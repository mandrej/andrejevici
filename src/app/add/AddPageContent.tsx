'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/stores/appStore'
import { useUserStore } from '@/stores/userStore'
import { canContribute } from '@/helpers'
import AddPhotoPageContent from '@/app/add/AddPhotoPageContent'
import AddVideoPageContent from '@/app/add/AddVideoPageContent'

export default function AddPageContent() {
  const router = useRouter()
  const addTab = useAppStore((state) => state.addTab)
  const user = useUserStore((state) => state.user)
  const initialized = useUserStore((state) => state.initialized)

  const canAdd = canContribute(user)

  useEffect(() => {
    if (initialized && !canAdd) {
      router.replace('/401')
    }
  }, [initialized, canAdd, router])

  if (!initialized || !canAdd) {
    return null
  }

  return addTab === 'photo' ? <AddPhotoPageContent /> : <AddVideoPageContent />
}
