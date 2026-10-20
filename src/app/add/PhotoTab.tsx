'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useValuesStore } from '@/stores/valuesStore'
import { useUserStore } from '@/stores/userStore'
import {
  useTransferStore,
  selectHasActiveKind,
  isCancelled,
  type TransferHandle,
} from '@/stores/transferStore'
import { createThumbnailUrl, fakeHistory, formatBytes } from '@/helpers'
import CONFIG from '@/config'
import notify from '@/helpers/notify'
import PictureCard from '@/components/PictureCard'
import AppButton from '@/components/atoms/AppButton'
import AppCheckbox from '@/components/atoms/AppCheckbox'
import AppIcon from '@/components/atoms/AppIcon'
import EditPhotoRecord from '@/components/EditPhotoRecord'
import EditVideoRecord from '@/components/EditVideoRecord'
import type { PhotoType } from '@/helpers/models'

interface ValidationErrors {
  file: File
  failedPropValidation: string
}

// Thumbnails are owned by the server: `functionThumb`'s `generateThumbnailOnUpload` Storage
// trigger fires as soon as an original lands and writes `thumbnails/<name>_400x400.jpeg`.
// The client therefore never uploads a thumbnail — a canvas crop sent to that same object would
// race the trigger and lose. It does crop each finished upload into a display-only
// `CONFIG.thumbSize` thumbnail, which is what the queue card and the edit dialog paint from:
// neither should decode a full-resolution original. That preview lives in component state, is
// never persisted, and is superseded by the server thumbnail once the record is published.

export const PhotoTab: React.FC = () => {
  const uploaded = useAppStore((state) => state.uploaded)
  const setUploaded = useAppStore((state) => state.setUploaded)
  const showEdit = useAppStore((state) => state.showEdit)
  const setShowEdit = useAppStore((state) => state.setShowEdit)
  const currentEdit = useAppStore((state) => state.currentEdit)
  const setCurrentEdit = useAppStore((state) => state.setCurrentEdit)
  const completePhoto = useAppStore((state) => state.completePhoto)
  const saveRecord = useAppStore((state) => state.saveRecord)
  const deleteRecord = useAppStore((state) => state.deleteRecord)

  const headlineToApply = useValuesStore((state) => state.headlineToApply)
  const tagsToApply = useValuesStore((state) => state.tagsToApply)
  const user = useUserStore((state) => state.user)

  const startTransfer = useTransferStore((state) => state.startTransfer)
  const cancelAll = useTransferStore((state) => state.cancelAll)
  // Scoped to this page's own uploads: a swap started on `/list` stays in the strip when the user
  // navigates here, and this page's "Cancel all" must not reach across and kill it.
  const uploading = useTransferStore(selectHasActiveKind('upload'))

  const [files, setFiles] = useState<File[]>([])
  const [selection, setSelection] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  // Local object-URL previews for the upload queue. Kept in component state (never in
  // the persisted store) so a `blob:` URL can't leak into localStorage.
  const [previews, setPreviews] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  // Uploaded Files, kept so EXIF can be read locally at publish time.
  const filesRef = useRef<Map<string, File>>(new Map())
  const previewsRef = useRef<Record<string, string>>(previews)
  previewsRef.current = previews

  // Revoke previews for records that have left the queue (published/deleted), whatever
  // the path that removed them.
  useEffect(() => {
    const currentIds = new Set(uploaded.map((item) => item.id))
    setPreviews((prev) => {
      const stale = Object.keys(prev).filter((id) => !currentIds.has(id))
      if (stale.length === 0) return prev
      const next = { ...prev }
      for (const id of stale) {
        URL.revokeObjectURL(prev[id])
        delete next[id]
        filesRef.current.delete(id)
      }
      return next
    })
  }, [uploaded])

  // Release any remaining object URLs when leaving the page.
  useEffect(
    () => () => {
      Object.values(previewsRef.current).forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const newFiles = Array.from(e.target.files)
    const rejected: ValidationErrors[] = []
    const accepted: File[] = []

    newFiles.forEach((f) => {
      if (CONFIG.fileSize && f.size > CONFIG.fileSize) {
        rejected.push({ file: f, failedPropValidation: 'max-file-size' })
      } else if (files.length + accepted.length >= CONFIG.fileMax) {
        rejected.push({ file: f, failedPropValidation: 'max-files' })
      } else {
        accepted.push(f)
      }
    })

    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted])
    }

    if (rejected.length > 0) {
      onValidationError(rejected)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    setIsDragging(false)
    if (!e.dataTransfer?.files) return
    const newFiles = Array.from(e.dataTransfer.files)
    const rejected: ValidationErrors[] = []
    const accepted: File[] = []

    newFiles.forEach((f) => {
      if (CONFIG.fileSize && f.size > CONFIG.fileSize) {
        rejected.push({ file: f, failedPropValidation: 'max-file-size' })
      } else if (files.length + accepted.length >= CONFIG.fileMax) {
        rejected.push({ file: f, failedPropValidation: 'max-files' })
      } else {
        accepted.push(f)
      }
    })

    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted])
    }

    if (rejected.length > 0) {
      onValidationError(rejected)
    }
  }

  /**
   * Queues one file. The store owns the bytes and the progress reporting; all this does is turn a
   * finished transfer into a queue card.
   *
   * Resolves with the Storage object name (`uuid8_name`), which is also the record id.
   */
  const uploadTask = async (file: File): Promise<string> => {
    const handle: TransferHandle = startTransfer(file, 'upload')
    const { id } = handle

    // Crop the finished upload into a display thumbnail now, alongside the download-URL lookup:
    // the canvas work is local, so it overlaps that round trip. It is never uploaded and never on
    // the upload's critical path — the card is appended once it has a small preview to paint, and
    // `createThumbnailUrl` falls back to the local file.
    const thumbnailPromise = createThumbnailUrl(file, CONFIG.thumbSize)

    const downloadURL = await handle.promise

    filesRef.current.set(id, file)
    const preview = await thumbnailPromise
    if (preview) setPreviews((prev) => ({ ...prev, [id]: preview }))

    const data: PhotoType = {
      id,
      url: downloadURL,
      size: file.size,
      email: user?.email || '',
      nick: user?.nick || '',
      kind: 'photo',
    }
    // Functional updater, not `getState().uploaded`: a queue of uploads finishes independently
    // and out of order, and reading the snapshot at each resolution would drop the others.
    setUploaded((prev) => [...prev, data])

    return id
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const promises: Promise<unknown>[] = []
    const filesToUpload = [...files]
    setFiles([])

    filesToUpload.forEach((file) => {
      const p = uploadTask(file)
        .then((val) => {
          notify({ type: 'positive', message: `Uploaded ${val}.`, icon: 'sym_r_check' })
          return val
        })
        .catch((err: unknown) => {
          // A cancellation is something the user asked for, so requeue the file without telling
          // them it was "rejected" — the file is back in the list, ready to send again.
          if (!isCancelled(err)) {
            notify({
              type: 'warning',
              message: `Rejected ${file.name}.`,
              caption: 'Please upload them again.',
            })
          }
          setFiles((prev) => [...prev, file])
          throw err
        })
      promises.push(p)
    })

    await Promise.allSettled(promises)
  }

  const onValidationError = (rejectedEntries: ValidationErrors[]) => {
    rejectedEntries.forEach((it) => {
      notify({
        type: 'warning',
        message: `${it.file.name}: ${it.failedPropValidation} validation error`,
        timeout: 0,
      })
    })
  }

  const editRecord = async (rec: PhotoType) => {
    const newRec: PhotoType = await completePhoto(
      rec,
      tagsToApply,
      headlineToApply ? headlineToApply.trim() : CONFIG.noTitle,
      filesRef.current.get(rec.id),
    )
    fakeHistory()
    setCurrentEdit(newRec)
    setShowEdit(true)
  }

  const deleteRec = (rec: PhotoType) => {
    setSelection((prev) => prev.filter((item) => item !== rec.id))
    deleteRecord(rec)
  }

  const publishSelected = async () => {
    let targetsIds = selection
    if (targetsIds.length === 0) {
      targetsIds = uploaded.map((item) => item.id)
    }

    const promises: Promise<unknown>[] = []
    const targets = uploaded.filter((item) => targetsIds.includes(item.id))

    for (const rec of targets) {
      const newRec: PhotoType = await completePhoto(
        rec,
        tagsToApply,
        headlineToApply ? headlineToApply.trim() : CONFIG.noTitle,
        filesRef.current.get(rec.id),
      )
      promises.push(saveRecord(newRec))
    }

    const results = await Promise.allSettled(promises)
    const successfulIds: string[] = []

    results.forEach((it) => {
      if (it.status === 'rejected') {
        notify({
          type: 'negative',
          message: `Rejected ${it.reason}.`,
          actions: [{ icon: 'sym_r_close' }],
          timeout: 0,
        })
      } else {
        setCurrentEdit(it.value as PhotoType)
        successfulIds.push((it.value as PhotoType).id)
      }
    })

    // Filtered against the current queue rather than this render's `uploaded`: a photo that
    // finished uploading while the publishes were in flight is in neither, and must be kept.
    setUploaded((prev) => prev.filter((item) => !successfulIds.includes(item.id)))
    setSelection([])
  }

  const handleCheckboxChange = (checked: boolean, val: string) => {
    if (checked) {
      setSelection((prev) => [...prev, val])
    } else {
      setSelection((prev) => prev.filter((item) => item !== val))
    }
  }

  return (
    <>
      {showEdit &&
        currentEdit &&
        (currentEdit.kind === 'video' ? (
          <EditVideoRecord rec={currentEdit} />
        ) : (
          // Paint the dialog from the client-side thumbnail of the just-uploaded File: a queued
          // record has no `thumb` yet, so without this the edit view would download and decode
          // the full-resolution original.
          <EditPhotoRecord rec={currentEdit} previewUrl={previews[currentEdit.id]} />
        ))}

      {/* File upload form */}
      <form
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck="false"
        onSubmit={onSubmit}
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Drop zone + file input */}
          <label
            className={`w-full sm:w-auto flex-1 flex flex-col items-center justify-center min-h-35 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setIsDragging(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              onDrop(e)
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              name="photos"
              className="hidden"
              multiple
              accept={CONFIG.fileType}
              onChange={onFileChange}
            />
            <AppIcon
              name="cloud_upload"
              className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2"
            />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {files.length > 0
                ? `${files.length} file(s) selected`
                : 'Drop images here, or click to browse'}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center px-4">
              Max {CONFIG.fileMax} jpg/jpeg/png/gif files, each under {formatBytes(CONFIG.fileSize)}
            </span>
          </label>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 min-w-30 w-full sm:w-auto">
            {uploading && (
              <AppButton
                label="Cancel all"
                type="button"
                color="negative"
                onClick={() => cancelAll('upload')}
              />
            )}
            {files.length > 0 && <AppButton label="Upload" type="submit" color="primary" />}
            <AppButton
              type="button"
              label={selection.length === 0 ? 'Publish all' : 'Publish selected'}
              onClick={publishSelected}
              color="primary"
              disabled={uploaded.length === 0}
            />
          </div>
        </div>
      </form>

      {/* Uploaded (unpublished) photo cards */}
      <div className="flex flex-wrap gap-4 mt-4">
        {uploaded.map((rec) => (
          <div
            key={rec.id}
            className="shrink-0"
            style={{ minWidth: '200px', maxWidth: '300px', flex: 1 }}
          >
            <PictureCard
              rec={rec}
              previewUrl={previews[rec.id]}
              action={
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <button
                    className="text-white hover:text-red-400 drop-shadow-md hover:scale-110 transition-all p-1"
                    onClick={() => deleteRec(rec)}
                  >
                    <AppIcon name="delete" className="w-6 h-6 leading-none" />
                  </button>
                  <AppCheckbox
                    modelValue={selection.includes(rec.id)}
                    onChange={(checked) => handleCheckboxChange(!!checked, rec.id)}
                    className="text-white drop-shadow-md hover:scale-110 transition-transform p-1"
                  />
                  <button
                    className="text-white hover:text-blue-400 drop-shadow-md hover:scale-110 transition-all p-1"
                    onClick={() => editRecord(rec)}
                  >
                    <AppIcon name="publish" className="w-6 h-6 leading-none" />
                  </button>
                </div>
              }
            />
          </div>
        ))}
      </div>
    </>
  )
}

export default PhotoTab
