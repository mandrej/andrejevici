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
import {
  sliceSlug,
  isValidEmail,
  getDateFields,
  toDateTimeLocalString,
  canContribute,
} from '@/helpers'
import type { DateInput } from '@/helpers'
import CONFIG from '@/config'
import type { PhotoType } from '@/helpers/models'
import type { Timestamp } from 'firebase/firestore'

interface UseEditRecordProps {
  rec: PhotoType
}

const EMAIL_REQUIRED = 'Author is required.'

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

  const [tmp, setTmp] = useState<PhotoType>(() => ({
    ...rec,
    date: toDateTimeLocalString(rec.date) as unknown as Timestamp,
  }))

  useEffect(() => {
    setTmp({
      ...rec,
      date: toDateTimeLocalString(rec.date) as unknown as Timestamp,
    })
  }, [rec])

  const copyTags = (source: string[]) => {
    useValuesStore.setState({ tagsToApply: source })
  }

  const mergeTags = (source: string[]) => {
    const arr = Array.isArray(source) ? source : []
    const merged = Array.from(new Set([...tagsToApply, ...arr])).sort()
    setTmp((prev) => ({ ...prev, tags: merged }))
  }

  const copyDate = (source: DateInput) => {
    useValuesStore.setState({ dateToApply: toDateTimeLocalString(source) })
  }

  const pasteDate = () => {
    const dateToApply = useValuesStore.getState().dateToApply
    if (!dateToApply) return
    setTmp((prev) => ({ ...prev, date: dateToApply as unknown as Timestamp }))
  }

  // The author is required: a record with no owner cannot be attributed, so clearing the field
  // reports immediately instead of waiting for the save. Only the admin picker can be emptied —
  // everyone else's author is a read-only input bound to their own account.
  const emailError = !tmp.email?.trim() ? EMAIL_REQUIRED : ''

  const prepareRecord = async (record: PhotoType) => {
    if (!canContribute(user)) {
      throw new Error(
        'Only users with a known nickname and editor or admin permissions can contribute.',
      )
    }
    const recordToSave = { ...record, ...getDateFields(record.date) }
    recordToSave.headline = recordToSave.headline?.trim() || CONFIG.noTitle
    recordToSave.text = sliceSlug(recordToSave.headline)

    // Ownership is admin-only. An administrator may hand a record to any email, and the nickname
    // follows that email; everyone else always saves under their own identity, whatever the form
    // held — the author field is read-only for them, and this is the enforcement behind it.
    if (user?.isAdmin) {
      recordToSave.email = recordToSave.email?.trim() || ''
      if (!recordToSave.email) {
        throw new Error(EMAIL_REQUIRED)
      }
      try {
        recordToSave.nick =
          recordToSave.email === user.email
            ? user.nick || ''
            : await getNickByEmail(recordToSave.email)
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
    emailError,
    isValidEmail,
    copyTags,
    mergeTags,
    copyDate,
    pasteDate,
    prepareRecord,
  }
}
