'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useUserStore } from '../../stores/userStore'
import {
  useValuesStore,
  selectTagsValues,
  selectModelValues,
  selectLensValues,
  selectEmailValues,
} from '../../stores/valuesStore'
import { U, formatBytes, sliceSlug, getYouTubeId } from '../../helpers'
import CONFIG from '../../config'
import readExif from '../../helpers/exif'
import notify from '../../helpers/notify'
import type { PhotoType } from '../../helpers/models'
import AutoComplete from '../AutoComplete'
import FileBroken from '../FileBroken'
import AppDialog from '../atoms/AppDialog'
import AppButton from '../atoms/AppButton'
import AppInput from '../atoms/AppInput'
import AppCheckbox from '../atoms/AppCheckbox'
import AppIcon from '../atoms/AppIcon'

interface EditRecordProps {
  rec: PhotoType
  onEditOk?: (filename: string) => void
}

export const EditRecord: React.FC<EditRecordProps> = ({ rec, onEditOk }) => {
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
  const [imgError, setImgError] = useState(false)
  const originalUrl = rec.url || ''

  // Sync state if rec prop changes
  useEffect(() => {
    setTmp({ ...rec })
  }, [rec])

  // Watch URL changes for videos to update thumb/filename automatically
  useEffect(() => {
    if (tmp.kind === 'video' && tmp.url) {
      const id = getYouTubeId(tmp.url)
      if (id) {
        setTmp((prev) => ({
          ...prev,
          filename: id,
          thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        }))
      } else {
        setTmp((prev) => ({ ...prev, thumb: '' }))
      }
    }
  }, [tmp.url, tmp.kind])

  const thumbUrl = useMemo(() => {
    if (tmp.thumb) return tmp.thumb
    if (tmp.kind === 'video') {
      const id = getYouTubeId(tmp.url)
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    }
    return tmp.url
  }, [tmp.thumb, tmp.url, tmp.kind])

  const getExif = async () => {
    const exif = await readExif(tmp.url)
    if (exif) {
      const tags = tmp.tags ? [...tmp.tags] : []
      if (exif.flash && !tags.includes('flash')) {
        tags.push('flash')
      }
      setTmp((prev) => ({
        ...prev,
        ...exif,
        tags,
      }))
    }
  }

  const isValidEmail = (val: string) => {
    const emailPattern =
      /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/
    return emailPattern.test(val) || 'Invalid email'
  }

  const copyTags = (source: string[]) => {
    useValuesStore.setState({ tagsToApply: source })
  }

  const mergeTags = (source: string[]) => {
    const arr = Array.isArray(source) ? source : []
    const merged = Array.from(new Set([...tagsToApply, ...arr])).sort()
    setTmp((prev) => ({ ...prev, tags: merged }))
  }

  const onCancel = () => {
    setShowEdit(false)
  }

  const onSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const recordToSave = { ...tmp }
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
        notify({ type: 'negative', message: String(err) })
        return
      }
    } else {
      recordToSave.email = user?.email || ''
      recordToSave.nick = user?.nick || ''
    }

    if (recordToSave.kind === 'video' && recordToSave.url !== originalUrl) {
      const id = getYouTubeId(recordToSave.url)
      recordToSave.thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
    }

    recordToSave.tags = recordToSave.tags ? [...recordToSave.tags] : []
    if (recordToSave.flash && !recordToSave.tags.includes('flash')) {
      recordToSave.tags.push('flash')
    }

    // Email validation
    const emailValid = isValidEmail(recordToSave.email)
    if (typeof emailValid === 'string') {
      notify({ type: 'negative', message: emailValid })
      return
    }

    if (recordToSave.kind === 'video' && rec && recordToSave.filename !== rec.filename) {
      try {
        const { photoCollection } = await import('../../helpers/collections')
        const { doc, deleteDoc } = await import('firebase/firestore')
        await deleteDoc(doc(photoCollection, rec.filename))
        useAppStore.setState((state) => ({
          objects: state.objects.filter((x) => x.filename !== rec.filename),
        }))
      } catch (err) {
        console.error('Failed to delete old video document:', err)
      }
    }

    try {
      await saveRecord(recordToSave)
      if (onEditOk) {
        onEditOk(U + recordToSave.filename)
      }
      setShowEdit(false)
    } catch (err) {
      console.error('Failed to save record:', err)
    }
  }

  return (
    <AppDialog modelValue={showEdit} maxWidth="max-w-3xl" onChange={setShowEdit}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <AppButton type="button" color="primary" label="Save" onClick={() => onSubmit()} />
          {user?.isAdmin && tmp.kind !== 'video' && (
            <AppButton
              type="button"
              flat
              label="Read Exif"
              onClick={getExif}
              className="hidden sm:inline-flex"
            />
          )}
        </div>
        {tmp.kind !== 'video' && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatBytes(tmp.size)} {tmp.dim}
          </span>
        )}
        <button
          className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick={onCancel}
        >
          <AppIcon name="close" className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-[85vh]">
        <form
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck="false"
          onSubmit={onSubmit}
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Thumbnail preview (desktop only) */}
            <div className="hidden sm:block sm:col-span-1 sm:row-span-2">
              <div
                className="relative w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
                style={{ paddingTop: '100%' }}
              >
                <img
                  src={thumbUrl}
                  alt={tmp.headline}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
                {imgError && <FileBroken />}
              </div>
            </div>

            {/* 1. Headline (separate row on small screen) */}
            <div className="col-span-2 sm:col-span-1">
              <AppInput
                modelValue={tmp.headline}
                onChangeValue={(val) => setTmp((prev) => ({ ...prev, headline: val }))}
                label="Headline"
                hint={`Without title: '${CONFIG.noTitle}'`}
                clearable
                autoFocus
              />
            </div>

            {/* 2. Tags (separate row on small screen) */}
            <div className="col-span-2 flex items-start gap-2">
              <div className="flex-1">
                <AutoComplete
                  label="Tags"
                  modelValue={tmp.tags}
                  onChange={(val) =>
                    setTmp((prev) => ({ ...prev, tags: Array.isArray(val) ? val : [] }))
                  }
                  options={tagsValues}
                  canadd
                  multiple
                  hint={
                    tagsToApply && tagsToApply.length ? 'merge with ' + tagsToApply.join(', ') : ''
                  }
                  onNewValue={(value, done) => addNewValue(value, 'tags', done)}
                />
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <button
                  type="button"
                  className="text-gray-400 hover:text-primary transition-colors p-1"
                  title="Copy tags"
                  onClick={() => copyTags(tmp.tags || [])}
                >
                  <AppIcon name="content_copy" className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="text-gray-400 hover:text-primary transition-colors p-1"
                  title="Paste tags"
                  onClick={() => mergeTags(tmp.tags || [])}
                >
                  <AppIcon name="content_paste" className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 3. Filename (separate row on small screen) */}
            <div className="col-span-2 sm:col-span-1">
              <AppInput modelValue={tmp.filename} label="Filename" readonly />
            </div>

            {/* All after in two columns */}
            {tmp.kind === 'video' && (
              <div className="col-span-2 sm:col-span-1">
                <AppInput
                  modelValue={tmp.url}
                  onChangeValue={(val) => setTmp((prev) => ({ ...prev, url: val }))}
                  label="Video URL"
                  hint="YouTube link"
                  required
                />
              </div>
            )}

            <div className="col-span-2">
              <AutoComplete
                label="Author"
                modelValue={tmp.email}
                onChange={(val) => setTmp((prev) => ({ ...prev, email: val as string }))}
                options={emailValues}
                hint="Admin can add friend's photo and email"
              />
            </div>

            <div className="col-span-2">
              <AppInput
                modelValue={tmp.date}
                onChangeValue={(val) => setTmp((prev) => ({ ...prev, date: val }))}
                label="Date taken"
                type="datetime-local"
              />
            </div>

            {/* Photo-only EXIF fields */}
            {tmp.kind !== 'video' && (
              <>
                <div className="col-span-2">
                  <AutoComplete
                    label="Camera Model"
                    modelValue={tmp.model}
                    onChange={(val) => setTmp((prev) => ({ ...prev, model: val as string }))}
                    options={modelValues}
                    canadd
                    onNewValue={(value, done) => addNewValue(value, 'model', done)}
                  />
                </div>
                <div className="col-span-2">
                  <AutoComplete
                    label="Camera Lens"
                    modelValue={tmp.lens}
                    onChange={(val) => setTmp((prev) => ({ ...prev, lens: val as string }))}
                    options={lensValues}
                    canadd
                    onNewValue={(value, done) => addNewValue(value, 'lens', done)}
                  />
                </div>
                <div className="col-span-1">
                  <AppInput
                    modelValue={tmp.focal_length}
                    onChangeValue={(val) =>
                      setTmp((prev) => ({ ...prev, focal_length: Number(val) }))
                    }
                    type="number"
                    label="Focal length [mm]"
                  />
                </div>
                <div className="col-span-1">
                  <AppInput
                    modelValue={tmp.iso}
                    onChangeValue={(val) => setTmp((prev) => ({ ...prev, iso: Number(val) }))}
                    type="number"
                    label="ISO [ASA]"
                  />
                </div>
                <div className="col-span-1">
                  <AppInput
                    modelValue={tmp.aperture}
                    onChangeValue={(val) => setTmp((prev) => ({ ...prev, aperture: Number(val) }))}
                    type="number"
                    step="0.1"
                    label="Aperture"
                  />
                </div>
                <div className="col-span-1">
                  <AppInput
                    modelValue={tmp.shutter}
                    onChangeValue={(val) => setTmp((prev) => ({ ...prev, shutter: val }))}
                    label="Shutter [s]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <AppInput
                    modelValue={tmp.loc}
                    onChangeValue={(val) => setTmp((prev) => ({ ...prev, loc: val }))}
                    label="Location [lat, lon]"
                    clearable
                  />
                </div>
                <div className="flex items-center gap-2 mt-2 col-span-2">
                  <AppCheckbox
                    modelValue={tmp.flash}
                    onChange={(val) => setTmp((prev) => ({ ...prev, flash: !!val }))}
                    label="Flash fired?"
                  />
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </AppDialog>
  )
}

export default EditRecord
