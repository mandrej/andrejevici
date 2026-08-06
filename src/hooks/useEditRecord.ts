'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useUserStore } from '@/stores/userStore'
import {
  useValuesStore,
  selectTagsValues,
  selectModelValues,
  selectLensValues,
  selectEmailValues,
} from '@/stores/valuesStore'
import { sliceSlug, isValidEmail } from '@/helpers'
import CONFIG from '@/config'
import type { PhotoType } from '@/helpers/models'

interface UseEditRecordProps {
  rec: PhotoType
}

export const useEditRecord = ({ rec }: UseEditRecordProps) => {
  const showEdit = useAppStore((state) => state.showEdit)
  const setShowEdit = useAppStore((state) => state.setShowEdit)
  const saveRecord = useAppStore((state) => state.saveRecord)
  const user = useUserStore((state) => state.user)
  const getNickByEmail = useUserStore((state) => state.getNickByEmail)

  const tagsValues = useValuesStore(selectTagsValues)
  const modelValues = useValuesStore(selectModelValues)
  const lensValues = useValuesStore(selectLensValues)
  const emailValues = useValuesStore(selectEmailValues)
  const tagsToApply = useValuesStore((state) => state.tagsToApply)
  const addNewValue = useValuesStore((state) => state.addNewValue)

  const [tmp, setTmp] = useState<PhotoType>({ ...rec })

  useEffect(() => {
    setTmp({ ...rec })
  }, [rec])

  const copyTags = (source: string[]) => {
    useValuesStore.setState({ tagsToApply: source })
  }

  const mergeTags = (source: string[]) => {
    const arr = Array.isArray(source) ? source : []
    const merged = Array.from(new Set([...tagsToApply, ...arr])).sort()
    setTmp((prev) => ({ ...prev, tags: merged }))
  }

  const prepareRecord = async (record: PhotoType) => {
    const recordToSave = { ...record }
    const datum = new Date(Date.parse(recordToSave.date || ''))
    recordToSave.year = datum.getFullYear()
    recordToSave.month = datum.getMonth() + 1
    recordToSave.day = datum.getDate()
    recordToSave.headline = recordToSave.headline?.trim() || CONFIG.noTitle
    recordToSave.text = sliceSlug(recordToSave.headline)

    if (recordToSave.email !== user?.email && user?.isAdmin) {
      try {
        recordToSave.nick = await getNickByEmail(recordToSave.email)
      } catch (err) {
        throw new Error(String(err))
      }
    } else {
      recordToSave.email = user?.email || ''
      recordToSave.nick = user?.nick || ''
    }

    recordToSave.tags = recordToSave.tags ? [...recordToSave.tags] : []

    // Basic email validation
    const emailValid = isValidEmail(recordToSave.email)
    if (typeof emailValid === 'string') {
      throw new Error(emailValid)
    }

    return recordToSave
  }

  return {
    showEdit,
    setShowEdit,
    saveRecord,
    user,
    tagsValues,
    modelValues,
    lensValues,
    emailValues,
    tagsToApply,
    addNewValue,
    tmp,
    setTmp,
    isValidEmail,
    copyTags,
    mergeTags,
    prepareRecord,
  }
}
