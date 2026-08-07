'use client'

import React, { useState } from 'react'
import { U, formatBytes } from '@/helpers'
import CONFIG from '@/config'
import readExif from '@/helpers/exif'
import notify from '@/helpers/notify'
import type { PhotoType } from '@/helpers/models'
import AutoComplete from '@/components/AutoComplete'
import FileBroken from '@/components/FileBroken'
import AppDialog from '@/components/atoms/AppDialog'
import AppButton from '@/components/atoms/AppButton'
import AppInput from '@/components/atoms/AppInput'
import AppCheckbox from '@/components/atoms/AppCheckbox'
import AppIcon from '@/components/atoms/AppIcon'
import { useEditRecord } from '@/hooks/useEditRecord'

interface EditPhotoRecordProps {
  rec: PhotoType
  onEditOk?: (filename: string) => void
}

export const EditPhotoRecord: React.FC<EditPhotoRecordProps> = ({ rec, onEditOk }) => {
  const {
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
    copyTags,
    mergeTags,
    prepareRecord,
  } = useEditRecord({ rec })

  const [imgError, setImgError] = useState(false)
  const thumbUrl = tmp.thumb || tmp.url

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

  const onCancel = () => {
    setShowEdit(false)
  }

  const onSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    try {
      const recordToSave = await prepareRecord(tmp)

      if (!recordToSave.tags) {
        recordToSave.tags = []
      }

      if (recordToSave.flash && !recordToSave.tags.includes('flash')) {
        recordToSave.tags.push('flash')
      }

      await saveRecord(recordToSave)
      if (onEditOk) {
        onEditOk(U + recordToSave.filename)
      }
      setShowEdit(false)
    } catch (err) {
      if (err instanceof Error) {
        notify({ type: 'negative', message: err.message })
      } else {
        console.error('Failed to save record:', err)
      }
    }
  }

  return (
    <AppDialog modelValue={showEdit} maxWidth="max-w-3xl" onChange={setShowEdit}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <AppButton type="button" color="primary" label="Save" onClick={() => onSubmit()} />
          {user?.isAdmin && (
            <AppButton
              type="button"
              flat
              label="Read Exif"
              onClick={getExif}
              className="hidden sm:inline-flex"
            />
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatBytes(tmp.size)} {tmp.dim?.join(' × ')}
        </span>
        <button
          className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick={onCancel}
        >
          <AppIcon name="close" className="w-6 h-6" />
        </button>
      </div>

      <div className="p-4 overflow-y-auto max-h-[85vh]">
        <form
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck="false"
          onSubmit={onSubmit}
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="hidden sm:block sm:col-span-1 sm:row-span-4">
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

            <div className="col-span-2 sm:col-span-1">
              <AppInput modelValue={tmp.filename} label="Filename" readonly />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <AutoComplete
                label="Author"
                modelValue={tmp.email}
                onChange={(val) => setTmp((prev) => ({ ...prev, email: val as string }))}
                options={emailValues}
                hint="Admin can add friend's photo and email"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <AppInput
                modelValue={tmp.date}
                onChangeValue={(val) => setTmp((prev) => ({ ...prev, date: val }))}
                label="Date taken"
                type="datetime-local"
              />
            </div>

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
                onChangeValue={(val) => setTmp((prev) => ({ ...prev, focal_length: Number(val) }))}
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
          </div>
        </form>
      </div>
    </AppDialog>
  )
}

export default EditPhotoRecord
