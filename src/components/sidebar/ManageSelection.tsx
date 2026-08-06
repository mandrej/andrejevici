'use client'

import React from 'react'
import { useAppStore } from '@/stores/appStore'
import { useUserStore } from '@/stores/userStore'
import { useValuesStore } from '@/stores/valuesStore'
import TagsMerge from '@/components/TagsMerge'
import AppButton from '@/components/atoms/AppButton'
import AppInput from '@/components/atoms/AppInput'
import { useScreen } from '@/composables/useScreen'

export const ManageSelection: React.FC = () => {
  const user = useUserStore((state) => state.user)
  const selected = useAppStore((state) => state.selected)
  const setSelected = useAppStore((state) => state.setSelected)
  const busy = useAppStore((state) => state.busy)
  const saveRecord = useAppStore((state) => state.saveRecord)
  const deleteRecord = useAppStore((state) => state.deleteRecord)

  const headlineToApply = useValuesStore((state) => state.headlineToApply)
  const tagsToApply = useValuesStore((state) => state.tagsToApply)
  const screen = useScreen()

  const handleHeadlineChange = (val: string) => {
    useValuesStore.setState({ headlineToApply: val })
  }

  const applyTags = async () => {
    for (const item of selected) {
      // Fetch fresh record from the objects store
      const objects = useAppStore.getState().objects
      const currentItem = objects.find((o) => o.filename === item.filename)
      if (!currentItem) continue

      const rec = { ...currentItem }
      rec.tags = Array.from(new Set([...(tagsToApply ?? []), ...(rec.tags ?? [])])).sort()
      await saveRecord(rec)
    }
    clearSelected()
  }

  const applyHeadline = async () => {
    if (!headlineToApply) return
    for (const item of selected) {
      const objects = useAppStore.getState().objects
      const currentItem = objects.find((o) => o.filename === item.filename)
      if (!currentItem) continue

      if (currentItem.kind === 'video') {
        // headlineToApply does not apply for video files: ignore and deselect
        continue
      }

      const rec = { ...currentItem }
      rec.headline = headlineToApply
      await saveRecord(rec)
    }
    clearSelected()
  }

  const deleteSelected = async () => {
    const toDelete = [...selected]
    for (const item of toDelete) {
      const objects = useAppStore.getState().objects
      const currentItem = objects.find((o) => o.filename === item.filename)
      if (!currentItem) continue

      await deleteRecord(currentItem)
    }
    clearSelected()
  }

  const clearSelected = () => {
    setSelected([])
  }

  return (
    <div className="bg-gray-55 dark:bg-gray-800 transition-colors p-2">
      {user?.isAuthorized && (
        <div className="mb-4">
          <AppInput
            modelValue={headlineToApply}
            onChangeValue={handleHeadlineChange}
            label="Headline to apply (photos only)"
            clearable
          />
        </div>
      )}

      {user?.isAuthorized && <TagsMerge label="Tags to apply" className="mb-4" placement="top" />}

      {selected.length > 0 && (
        <div className={`flex flex-col gap-2 ${screen.gtSm ? 'gap-3' : ''}`}>
          <div className="text-xs text-center text-gray-500">{selected.length} items selected</div>

          {tagsToApply && tagsToApply.length > 0 && (
            <AppButton
              flat
              label="Merge Tags"
              icon="sym_r_merge"
              onClick={applyTags}
              disabled={busy}
              className="justify-end"
            />
          )}

          {headlineToApply && (
            <AppButton
              flat
              label="Apply Headline"
              icon="sym_r_find_replace"
              onClick={applyHeadline}
              disabled={busy}
              className="justify-end"
            />
          )}

          <AppButton
            color="negative"
            label="Delete Selected"
            icon="sym_r_delete"
            onClick={deleteSelected}
            disabled={busy}
            className="justify-end"
          />

          <AppButton
            flat
            label="Clear Selection"
            icon="sym_r_clear_all"
            onClick={clearSelected}
            className="justify-end"
          />
        </div>
      )}
    </div>
  )
}

export default ManageSelection
