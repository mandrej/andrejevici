'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useUserStore } from '@/stores/userStore'
import { useValuesStore, selectNickValues, selectNickWithCount } from '@/stores/valuesStore'
import { useScreen } from '@/composables/useScreen'
import ErrorBanner from '@/components/ErrorBanner'
import LocalSearch from '@/components/LocalSearch'
import notify from '@/helpers/notify'
import AppBadge from '@/components/atoms/AppBadge'
import AppButton from '@/components/atoms/AppButton'
import AppInput from '@/components/atoms/AppInput'
import AppIcon from '@/components/atoms/AppIcon'
import AppDialog from '@/components/atoms/AppDialog'
import { getAgeDays, type DateInput } from '@/helpers'
import type { UsersAndDevices } from '@/helpers/models'
import CONFIG from '@/config'

export const UsersTab: React.FC = () => {
  const user = useUserStore((state) => state.user)
  const fetchUsersAndDevices = useUserStore((state) => state.fetchUsersAndDevices)
  const updateUser = useUserStore((state) => state.updateUser)
  const deleteUser = useUserStore((state) => state.deleteUser)
  const logoutUser = useUserStore((state) => state.logoutUser)

  const values = useValuesStore((state) => state.values)
  const nickValues = useValuesStore(selectNickValues)
  const nickWithCount = useValuesStore(selectNickWithCount)
  const screen = useScreen()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<UsersAndDevices[]>([])
  const [search, setSearch] = useState('')

  const [showNickDialog, setShowNickDialog] = useState(false)
  const [userToEdit, setUserToEdit] = useState<UsersAndDevices | null>(null)
  const [tempNick, setTempNick] = useState('')

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UsersAndDevices | null>(null)

  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [userToLogout, setUserToLogout] = useState<UsersAndDevices | null>(null)

  const filteredResult = useMemo(() => {
    if (!search) return result
    const query = search.toLowerCase()
    return result.filter(
      (item) =>
        (item.nick || '').toLowerCase().includes(query) ||
        (item.email || '').toLowerCase().includes(query),
    )
  }, [result, search])

  const adminCount = useMemo(() => {
    return result.filter((u) => u.isAdmin).length
  }, [result])

  const fetchList = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const subscribersAndDevices = await fetchUsersAndDevices()
      setResult(subscribersAndDevices ?? [])
      if (!subscribersAndDevices || subscribersAndDevices.length === 0) {
        setError('No subscribers found')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to fetch subscribers')
    } finally {
      setBusy(false)
    }
  }, [fetchUsersAndDevices])

  useEffect(() => {
    void fetchList()
  }, [])

  const confirmDeleteUser = (u: UsersAndDevices) => {
    if (contribution(u) > 0) {
      notify({ type: 'negative', message: 'Cannot delete a user with contributions' })
      return
    }
    setUserToDelete(u)
    setShowDeleteDialog(true)
  }

  const doDeleteUser = async () => {
    if (userToDelete) {
      if (contribution(userToDelete) > 0) {
        notify({ type: 'negative', message: 'Cannot delete a user with contributions' })
        setShowDeleteDialog(false)
        return
      }
      if (userToDelete.isAdmin && adminCount === 1) {
        notify({ type: 'negative', message: 'Cannot delete the only admin user' })
        setShowDeleteDialog(false)
        return
      }
      try {
        await deleteUser(userToDelete.uid)
        setShowDeleteDialog(false)
        await fetchList()
      } catch (err) {
        notify({ type: 'negative', message: `Failed to delete: ${err}` })
      }
    }
  }

  const confirmLogoutUser = (u: UsersAndDevices) => {
    setUserToLogout(u)
    setShowLogoutDialog(true)
  }

  const doLogoutUser = async () => {
    if (userToLogout) {
      try {
        await logoutUser(userToLogout)
        setShowLogoutDialog(false)
        await fetchList()
      } catch (err) {
        notify({ type: 'negative', message: `Failed to log out: ${err}` })
      }
    }
  }

  const openNickDialog = (u: UsersAndDevices) => {
    if (contribution(u) > 0) {
      notify({ type: 'negative', message: 'Cannot change nickname for a user with contributions' })
      return
    }
    setUserToEdit(u)
    setTempNick(u.nick || '')
    setShowNickDialog(true)
  }

  const toggleAdmin = async (item: UsersAndDevices, val: boolean) => {
    const nextResult = result.map((u) => {
      if (u.uid === item.uid) {
        return { ...u, isAdmin: val }
      }
      return u
    })
    const remainingAdmins = nextResult.filter((u) => u.isAdmin).length
    if (!val && remainingAdmins === 0) {
      notify({ type: 'negative', message: 'Cannot remove the last administrator' })
      return
    }

    try {
      const updatedItem = { ...item, isAdmin: val }
      await updateUser(updatedItem, 'isAdmin')
      setResult(nextResult)
    } catch (err) {
      notify({ type: 'negative', message: `Failed to update: ${err}` })
    }
  }

  const handleAdminCheckboxChange = (checked: boolean, item: UsersAndDevices) => {
    void toggleAdmin(item, checked)
  }

  const toggleEditor = async (item: UsersAndDevices, val: boolean) => {
    if (!item.nick) return
    try {
      const updatedItem = { ...item, isAuthorized: val }
      await updateUser(updatedItem, 'isAuthorized')
      setResult((prev) => prev.map((u) => (u.uid === item.uid ? updatedItem : u)))
    } catch (err) {
      notify({ type: 'negative', message: `Failed to update: ${err}` })
    }
  }

  const togglePush = async (item: UsersAndDevices, val: boolean) => {
    if (!item.nick) return
    try {
      const updatedItem = { ...item, allowPush: val }
      await updateUser(updatedItem, 'allowPush')
      setResult((prev) => prev.map((u) => (u.uid === item.uid ? updatedItem : u)))
    } catch (err) {
      notify({ type: 'negative', message: `Failed to update: ${err}` })
    }
  }

  const saveNick = async () => {
    if (userToEdit && tempNick) {
      if (contribution(userToEdit) > 0) {
        notify({
          type: 'negative',
          message: 'Cannot change nickname for a user with contributions',
        })
        setShowNickDialog(false)
        return
      }
      const updatedItem = { ...userToEdit, nick: tempNick }
      try {
        await updateUser(updatedItem, 'nick')
        setResult((prev) => prev.map((u) => (u.uid === userToEdit.uid ? updatedItem : u)))
        setShowNickDialog(false)
      } catch (err) {
        notify({ type: 'negative', message: `Failed to save nickname: ${err}` })
      }
    }
  }

  const ageDays = (timestamp: unknown) => getAgeDays(timestamp as DateInput)

  const contribution = useCallback(
    (u: UsersAndDevices | null | undefined) => {
      if (!u) return 0
      let count = 0
      if (u.email && values.email?.[u.email]) {
        count = Math.max(count, values.email[u.email])
      }
      if (u.nick && nickWithCount[u.nick]) {
        count = Math.max(count, nickWithCount[u.nick])
      }
      return count
    },
    [values.email, nickWithCount],
  )

  const maxContribution = useMemo(() => {
    return result.reduce((max, u) => Math.max(max, contribution(u)), 0)
  }, [result, contribution])

  return (
    <>
      <ErrorBanner inquiry={!busy && error !== ''} title={error} />

      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <LocalSearch
          modelValue={search}
          onChangeValue={setSearch}
          label="Search users"
          options={nickValues}
        />
      </div>

      <div className="p-4 overflow-y-auto" style={{ height: '65vh' }}>
        <div className={`flex flex-col gap-2 ${screen.xs ? 'gap-1' : ''}`}>
          {busy
            ? Array.from({ length: 5 }).map((_, n) => (
                <div
                  key={n}
                  className="flex items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
                >
                  <div className="shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full mr-3"></div>
                  <div className="grow">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                  </div>
                  {screen.gtXs && (
                    <div className="flex flex-wrap gap-1 ml-auto max-w-xs">
                      <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                      <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    </div>
                  )}
                  <div className={`flex gap-1 ml-auto ${screen.xs ? 'flex-col' : 'flex-row'}`}>
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))
            : filteredResult.map((item) => (
                <div
                  key={item.uid || item.email}
                  className="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="shrink-0 mr-3">
                    <AppBadge
                      color="warning"
                      textColor="black"
                      className="text-sm px-2 py-1 justify-center"
                    >
                      <span className="grid grid-cols-1 place-items-center tabular-nums">
                        <span
                          className="col-start-1 row-start-1 invisible select-none"
                          aria-hidden="true"
                        >
                          {maxContribution}
                        </span>
                        <span className="col-start-1 row-start-1">{contribution(item)}</span>
                      </span>
                    </AppBadge>
                  </div>

                  <div className="grow">
                    <div className="flex items-center gap-1 text-base font-semibold flex-wrap">
                      <span className={!item.uid ? 'text-negative' : ''}>{item.nick || '???'}</span>
                      {contribution(item) === 0 && (
                        <>
                          <AppButton
                            flat
                            onClick={() => openNickDialog(item)}
                            color="primary"
                            className="p-1!"
                            title="Change nickname"
                          >
                            <AppIcon name="edit" className="w-4 h-4" />
                            <span className="text-xs ml-1 font-normal">Change</span>
                          </AppButton>
                          <AppButton
                            flat
                            onClick={() => confirmDeleteUser(item)}
                            color="negative"
                            className="p-1!"
                            title="Delete user"
                          >
                            <AppIcon name="delete" className="w-4 h-4" />
                            <span className="text-xs ml-1 font-normal">Delete</span>
                          </AppButton>
                        </>
                      )}
                      {user?.isAdmin && (
                        <AppButton
                          flat
                          onClick={() => confirmLogoutUser(item)}
                          color="warning"
                          className="p-1!"
                          title="Logout user"
                        >
                          <AppIcon name="logout" className="w-4 h-4" />
                          <span className="text-xs ml-1 font-normal">Logout</span>
                        </AppButton>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{item.email}</div>
                    <div className="text-xs text-gray-400">
                      {ageDays(item.timestamp) > CONFIG.loginDays ? (
                        <span>Logged out / Expired</span>
                      ) : (
                        `subscribed ${ageDays(item.timestamp)} days ago`
                      )}
                    </div>
                  </div>

                  {screen.gtXs && (
                    <div className="shrink-0 ml-3 max-w-50">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {item.timestamps && item.timestamps.length > 0 ? (
                          item.timestamps.map((timestamp, index) => (
                            <AppBadge key={index} color="secondary" textColor="dark">
                              {ageDays(timestamp)}
                            </AppBadge>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">no devices</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    className={`shrink-0 ml-3 flex gap-x-3 ${screen.xs ? 'flex-col gap-y-1' : 'flex-row'}`}
                  >
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!item.isAdmin}
                        disabled={user?.email === item.email || !item.nick}
                        className="w-4 h-4 rounded border-gray-300 text-negative focus:ring-negative"
                        onChange={(e) => handleAdminCheckboxChange(e.target.checked, item)}
                      />
                      <span className="text-xs">Admin</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!item.isAuthorized}
                        disabled={!item.nick}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        onChange={(e) => void toggleEditor(item, e.target.checked)}
                      />
                      <span className="text-xs">Editor</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!item.allowPush}
                        disabled={!item.nick}
                        className="w-4 h-4 rounded border-gray-300 text-secondary focus:ring-secondary"
                        onChange={(e) => void togglePush(item, e.target.checked)}
                      />
                      <span className="text-xs">Push</span>
                    </label>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Delete User Confirmation Dialog */}
      <AppDialog modelValue={showDeleteDialog} maxWidth="max-w-sm" onChange={setShowDeleteDialog}>
        <div className="p-6">
          <div className="text-lg font-bold mb-2">Delete user?</div>
          <p className="text-gray-600 dark:text-gray-400">
            Remove <strong>{userToDelete?.nick}</strong> ({userToDelete?.email})? This cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <AppButton flat label="Cancel" onClick={() => setShowDeleteDialog(false)} />
            <AppButton flat label="Delete" color="negative" onClick={doDeleteUser} />
          </div>
        </div>
      </AppDialog>

      {/* Logout User Confirmation Dialog */}
      <AppDialog modelValue={showLogoutDialog} maxWidth="max-w-sm" onChange={setShowLogoutDialog}>
        <div className="p-6">
          <div className="text-lg font-bold mb-2">Logout user?</div>
          <p className="text-gray-600 dark:text-gray-400">
            Log out <strong>{userToLogout?.nick || userToLogout?.email}</strong>? Their session will
            be expired and device tokens removed.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <AppButton flat label="Cancel" onClick={() => setShowLogoutDialog(false)} />
            <AppButton flat label="Logout" color="warning" onClick={doLogoutUser} />
          </div>
        </div>
      </AppDialog>

      {/* Nickname Edit Dialog */}
      <AppDialog modelValue={showNickDialog} maxWidth="max-w-sm" onChange={setShowNickDialog}>
        <div className="p-6">
          <div className="text-lg font-bold mb-4">Change nickname for {userToEdit?.email}</div>
          <AppInput
            modelValue={tempNick}
            onChangeValue={setTempNick}
            label="New nickname"
            autoFocus
            clearable
            onKeyUp={(e) => {
              if (e.key === 'Enter' && tempNick && !nickValues.includes(tempNick)) {
                void saveNick()
              }
            }}
          />
          {tempNick && nickValues.includes(tempNick) && (
            <p className="text-xs text-negative mt-1">Nickname already taken</p>
          )}
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
          <AppButton flat label="Cancel" onClick={() => setShowNickDialog(false)} />
          <AppButton
            flat
            label="Save"
            onClick={saveNick}
            disabled={!tempNick || nickValues.includes(tempNick)}
          />
        </div>
      </AppDialog>
    </>
  )
}

export default UsersTab
