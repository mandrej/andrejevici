'use client'

import React, { useState, useMemo } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useValuesStore } from '@/stores/valuesStore'
import LocalSearch from '@/components/LocalSearch'
import CONFIG from '@/config'
import AppInput from '@/components/atoms/AppInput'
import AppButton from '@/components/atoms/AppButton'
import AppBadge from '@/components/atoms/AppBadge'
import AppSelect from '@/components/atoms/AppSelect'
import AppDialog from '@/components/atoms/AppDialog'
import AppIcon from '@/components/atoms/AppIcon'

import { renameValue, deleteValue, addValue as addCounterValue } from '@/helpers/remedy'
import notify from '@/helpers/notify'
import type { MetaOption } from '@/helpers/models'

const metaOptions: MetaOption[] = [
  { label: 'Manage Kinds', value: 'kind', icon: 'sym_r_category', short: 'Kind' },
  { label: 'Manage Tags', value: 'tags', icon: 'sym_r_label', short: 'Tag' },
  { label: 'Manage Cameras', value: 'model', icon: 'sym_r_photo_camera', short: 'Camera' },
  { label: 'Manage Lenses', value: 'lens', icon: 'sym_r_camera', short: 'Lens' },
]

export const MetaTab: React.FC = () => {
  const metaTab = useAppStore((state) => state.metaTab)
  const setMetaTab = useAppStore((state) => state.setMetaTab)
  const searchBy = useAppStore((state) => state.searchBy)

  const values = useValuesStore((state) => state.values)
  const countersBuild = useValuesStore((state) => state.countersBuild)

  const [newValue, setNewValue] = useState('')
  const [search, setSearch] = useState('')
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [valueToRename, setValueToRename] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [valueToDelete, setValueToDelete] = useState('')

  // Client-side sort state
  const [sortField, setSortField] = useState<'name' | 'count'>('count')
  const [sortAsc, setSortAsc] = useState(false)

  const activeTabShort = useMemo(() => {
    return metaOptions.find((o) => o.value === metaTab)?.short || 'Value'
  }, [metaTab])

  const currentCounts = useMemo(() => {
    return values[metaTab as keyof typeof values] || {}
  }, [values, metaTab])

  const currentValueList = useMemo(() => {
    return Object.keys(currentCounts).sort()
  }, [currentCounts])

  const toggleSort = (field: 'name' | 'count') => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const sortedRows = useMemo(() => {
    let list = currentValueList
    if (search) {
      list = list.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
    }
    const rows = list.map((val) => ({ name: val, count: currentCounts[val] || 0 }))

    rows.sort((a, b) => {
      const dir = sortAsc ? 1 : -1
      if (sortField === 'name') {
        return a.name.localeCompare(b.name) * dir
      }
      return (a.count - b.count) * dir
    })

    return rows
  }, [currentValueList, currentCounts, search, sortField, sortAsc])

  const isValueInUse = useMemo(() => {
    return !!(newTagName && currentValueList.includes(newTagName) && newTagName !== valueToRename)
  }, [newTagName, currentValueList, valueToRename])

  const addValue = async () => {
    if (newValue !== '' && !currentValueList.includes(newValue)) {
      try {
        await addCounterValue(metaTab, newValue)
        notify({
          type: 'positive',
          message: `${activeTabShort} "${newValue}" added`,
          icon: 'sym_r_check',
        })
        setNewValue('')
      } catch (error) {
        notify({
          type: 'negative',
          message: `Failed to add: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }
  }

  const confirmDelete = (val: string) => {
    if (metaTab === 'tags' && val === 'flash') {
      notify({ type: 'warning', message: 'Cannot remove "flash"' })
      return
    }
    if (metaTab === 'model' && val === CONFIG.unknownModel) {
      notify({ type: 'warning', message: `Cannot remove "${CONFIG.unknownModel}"` })
      return
    }
    setValueToDelete(val)
    setShowDeleteDialog(true)
  }

  const removeValueAction = async () => {
    const val = valueToDelete
    setShowDeleteDialog(false)
    try {
      await deleteValue(metaTab, val)
      await countersBuild(metaTab)
      notify({
        type: 'positive',
        message: `${activeTabShort} "${val}" removed`,
        icon: 'sym_r_check',
      })
    } catch (error) {
      notify({
        type: 'negative',
        message: `Failed to remove: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  const rebuildCounts = async () => {
    try {
      await countersBuild(metaTab)
      notify({
        type: 'positive',
        message: `Successfully rebuilt ${metaTab} counts`,
        icon: 'sym_r_check',
      })
    } catch (error) {
      notify({
        message: `Failed to rebuild: ${error instanceof Error ? error.message : String(error)}`,
        type: 'negative',
      })
    }
  }

  const openRenameDialog = (val: string) => {
    if (metaTab === 'tags' && val === 'flash') return
    if (metaTab === 'model' && val === CONFIG.unknownModel) return
    setValueToRename(val)
    setNewTagName(val)
    setShowRenameDialog(true)
  }

  const performRename = async () => {
    if (!valueToRename || !newTagName) return
    if (valueToRename === newTagName) {
      setShowRenameDialog(false)
      return
    }
    if (metaTab === 'tags' && valueToRename === 'flash') {
      notify({ type: 'warning', message: 'Cannot change "flash"' })
      return
    }
    if (metaTab === 'model' && valueToRename === CONFIG.unknownModel) {
      notify({ type: 'warning', message: `Cannot change "${CONFIG.unknownModel}"` })
      return
    }

    try {
      await renameValue(metaTab, valueToRename, newTagName)
      await countersBuild(metaTab)
      notify({
        type: 'positive',
        message: `${valueToRename} renamed to ${newTagName}`,
        icon: 'sym_r_check',
      })
      setShowRenameDialog(false)
    } catch (error) {
      notify({
        message: `Failed to rename: ${error instanceof Error ? error.message : String(error)}`,
        type: 'negative',
      })
    }
  }

  return (
    <>
      {/* Header: tab selector */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <AppSelect
          modelValue={metaTab}
          options={metaOptions.map((o) => ({ label: o.label, value: o.value }))}
          className="flex-1 max-w-xs"
          flat
          onChange={(val) => setMetaTab(val)}
        />
      </div>

      {/* Add new value + rebuild */}
      <div className="flex gap-2 px-4 pt-3 items-start">
        <div className="flex-1">
          <AppInput
            modelValue={newValue}
            onChangeValue={setNewValue}
            label={`Add new ${activeTabShort.toLowerCase()}`}
            clearable
          />
          {newValue && currentValueList.includes(newValue) && (
            <p className="text-xs text-negative mt-1">Already exists</p>
          )}
        </div>
        <AppButton label="Add" onClick={addValue} color="primary" className="mt-1" />
        <AppButton
          flat
          icon="build"
          label="Rebuild"
          onClick={rebuildCounts}
          color="primary"
          className="mt-1 whitespace-nowrap"
          title={`Rebuild ${metaTab.toLowerCase()} counts`}
        />
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <LocalSearch
          modelValue={search}
          onChangeValue={setSearch}
          label={`Search ${activeTabShort.toLowerCase()}`}
          options={currentValueList}
        />
      </div>

      {/* Data table */}
      <div
        className="overflow-auto mx-4 mb-4 border border-gray-200 dark:border-gray-700 rounded-lg"
        style={{ height: '58vh' }}
      >
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
            <tr>
              <th
                className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                onClick={() => toggleSort('name')}
              >
                Name{' '}
                <span className="text-xs">{sortField === 'name' ? (sortAsc ? '↑' : '↓') : ''}</span>
              </th>
              <th
                className="text-right px-3 py-2 font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                onClick={() => toggleSort('count')}
              >
                Count{' '}
                <span className="text-xs">
                  {sortField === 'count' ? (sortAsc ? '↑' : '↓') : ''}
                </span>
              </th>
              <th className="px-3 py-2 w-10" />
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sortedRows.map((row) => (
              <tr
                key={row.name}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td
                  className="px-3 py-2 cursor-pointer text-primary hover:underline"
                  onClick={() =>
                    searchBy({ [metaTab]: metaTab === 'tags' ? [row.name] : row.name })
                  }
                >
                  {row.name}
                </td>
                <td className="px-3 py-2 text-right">
                  <AppBadge color="secondary" textColor="black" className="text-xs">
                    {row.count}
                  </AppBadge>
                </td>
                <td className="px-3 py-2 text-right">
                  {metaTab === 'tags' && (
                    <button
                      className="text-negative hover:opacity-80 transition-opacity disabled:opacity-30 p-1"
                      disabled={row.name === 'flash'}
                      title={`Remove ${activeTabShort.toLowerCase()}`}
                      onClick={() => confirmDelete(row.name)}
                    >
                      <AppIcon name="delete" className="w-5 h-5" />
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="text-primary hover:opacity-80 transition-opacity disabled:opacity-30 p-1"
                    disabled={
                      (metaTab === 'tags' && row.name === 'flash') ||
                      (metaTab === 'model' && row.name === CONFIG.unknownModel)
                    }
                    title={`Rename ${activeTabShort.toLowerCase()}`}
                    onClick={() => openRenameDialog(row.name)}
                  >
                    <AppIcon name="edit" className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rename Dialog */}
      <AppDialog modelValue={showRenameDialog} maxWidth="max-w-sm" onChange={setShowRenameDialog}>
        <div className="p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Rename {activeTabShort.toLowerCase()} "{valueToRename}"
          </h2>
          <AppInput
            modelValue={newTagName}
            onChangeValue={setNewTagName}
            label={`New ${activeTabShort.toLowerCase()} name`}
            autoFocus
            clearable
            onKeyUp={(e) => {
              if (e.key === 'Enter') void performRename()
            }}
          />
          {newTagName && (
            <p className={`text-xs mt-1 ${isValueInUse ? 'text-negative' : 'text-positive'}`}>
              {isValueInUse ? 'Name exists (will merge)' : 'Name available'}
            </p>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <AppButton flat label="Cancel" onClick={() => setShowRenameDialog(false)} />
            <AppButton
              flat
              label={isValueInUse ? 'Merge' : 'Rename'}
              onClick={performRename}
              disabled={!newTagName}
            />
          </div>
        </div>
      </AppDialog>

      {/* Delete Dialog */}
      <AppDialog modelValue={showDeleteDialog} maxWidth="max-w-sm" onChange={setShowDeleteDialog}>
        <div className="p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
            Remove "{valueToDelete}"
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Are you sure you want to remove {activeTabShort.toLowerCase()}{' '}
            <strong>"{valueToDelete}"</strong>?<br />
            Operation can't be undone.
          </p>
          <div className="flex justify-end gap-3">
            <AppButton flat label="Cancel" onClick={() => setShowDeleteDialog(false)} />
            <AppButton flat label="Remove" color="negative" onClick={removeValueAction} />
          </div>
        </div>
      </AppDialog>
    </>
  )
}

export default MetaTab
