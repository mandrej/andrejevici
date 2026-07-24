'use client'

import React, { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../../firebase'
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTaskSnapshot,
} from 'firebase/storage'
import { useAppStore } from '../../stores/appStore'
import { useValuesStore } from '../../stores/valuesStore'
import { useUserStore } from '../../stores/userStore'
import { fakeHistory, formatBytes } from '../../helpers'
import CONFIG from '../../config'
import notify from '../../helpers/notify'
import PictureCard from '../../components/PictureCard'
import { UploadTracker } from '../../helpers/uploadTracker'
import AppButton from '../atoms/AppButton'
import AppCheckbox from '../atoms/AppCheckbox'
import AppIcon from '../atoms/AppIcon'
import EditPhotoRecord from '../dialog/EditPhotoRecord'
import EditVideoRecord from '../dialog/EditVideoRecord'
import type { PhotoType } from '../../helpers/models'

interface ValidationErrors {
  file: File
  failedPropValidation: string
}

export const PhotoTab: React.FC = () => {
  const uploaded = useAppStore((state) => state.uploaded)
  const setUploaded = useAppStore((state) => state.setUploaded)
  const setProgressInfo = useAppStore((state) => state.setProgressInfo)
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

  const [files, setFiles] = useState<File[]>([])
  const [selection, setSelection] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [activeTrackerNames, setActiveTrackerNames] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const trackersRef = useRef<Map<string, UploadTracker>>(new Map())

  useEffect(() => {
    setProgressInfo({})
  }, [setProgressInfo])

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
    const accepted: File[] = []

    newFiles.forEach((f) => {
      if (files.length + accepted.length < CONFIG.fileMax) {
        accepted.push(f)
      }
    })

    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted])
    }
  }

  const cancelAll = () => {
    trackersRef.current.forEach((tracker) => {
      if (!tracker.isTerminal()) tracker.cancel()
    })
    trackersRef.current.clear()
    setActiveTrackerNames([])
    setProgressInfo({})
  }

  const uploadTask = (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const id = uuidv4().substring(0, 8)
      const filename = `${id}_${file.name}`
      const _ref = storageRef(storage, filename)
      const tracker = new UploadTracker(filename)
      trackersRef.current.set(filename, tracker)
      setActiveTrackerNames(Array.from(trackersRef.current.keys()))

      setProgressInfo({ ...useAppStore.getState().progressInfo, [filename]: 0 })

      const uploadTaskObj = uploadBytesResumable(_ref, file, {
        contentType: file.type,
        cacheControl: 'public, max-age=604800',
      })
      tracker.setTask(uploadTaskObj)

      uploadTaskObj.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          tracker.updateProgress(snapshot)
          setProgressInfo({ ...useAppStore.getState().progressInfo, [filename]: tracker.progress })
        },
        (error: Error) => {
          tracker.markError(error)
          const nextProgress = { ...useAppStore.getState().progressInfo }
          delete nextProgress[filename]
          setProgressInfo(nextProgress)
          trackersRef.current.delete(filename)
          setActiveTrackerNames(Array.from(trackersRef.current.keys()))
          reject(new Error(filename))
        },
        () => {
          getDownloadURL(uploadTaskObj.snapshot.ref)
            .then((downloadURL) => {
              tracker.complete(downloadURL)
              const nextProgress = { ...useAppStore.getState().progressInfo }
              delete nextProgress[filename]
              setProgressInfo(nextProgress)
              trackersRef.current.delete(filename)
              setActiveTrackerNames(Array.from(trackersRef.current.keys()))

              const data: PhotoType = {
                url: downloadURL,
                filename: filename,
                size: file.size,
                email: user?.email || '',
                nick: user?.nick || '',
                kind: 'photo',
              }
              setUploaded([...useAppStore.getState().uploaded, data])
              resolve(filename)
            })
            .catch((err) => {
              tracker.markError(err)
              reject(new Error(`Failed to get download URL: ${filename}`))
            })
        },
      )
    })
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
        .catch((err: Error) => {
          notify({
            type: 'warning',
            message: `Rejected ${file.name}.`,
            caption: 'Please upload them again.',
          })
          const reason = err.message
          if (typeof reason === 'string') {
            const tracker = trackersRef.current.get(reason)
            if (tracker && !tracker.isTerminal()) tracker.cancel()
            trackersRef.current.delete(reason)
            setActiveTrackerNames(Array.from(trackersRef.current.keys()))
          }
          setFiles((prev) => [...prev, file])
          throw err
        })
      promises.push(p)
    })

    await Promise.allSettled(promises)
    setProgressInfo({})
  }

  const onValidationError = (rejectedEntries: ValidationErrors[]) => {
    rejectedEntries.forEach((it) => {
      notify({
        type: 'warning',
        message: `${it.file.name}: ${it.failedPropValidation} validation error`,
        actions: [{ icon: 'sym_r_close' }],
        timeout: 0,
      })
    })
  }

  const editRecord = async (rec: PhotoType) => {
    const newRec: PhotoType = await completePhoto(
      rec,
      tagsToApply,
      headlineToApply ? headlineToApply.trim() : CONFIG.noTitle,
    )
    fakeHistory()
    setCurrentEdit(newRec)
    setShowEdit(true)
  }

  const deleteRec = (rec: PhotoType) => {
    setSelection((prev) => prev.filter((item) => item !== rec.filename))
    deleteRecord(rec)
  }

  const publishSelected = async () => {
    let targetsFilenames = selection
    if (targetsFilenames.length === 0) {
      targetsFilenames = uploaded.map((item) => item.filename)
    }

    const promises: Promise<unknown>[] = []
    const targets = uploaded.filter((item) => targetsFilenames.includes(item.filename))

    for (const rec of targets) {
      const newRec: PhotoType = await completePhoto(
        rec,
        tagsToApply,
        headlineToApply ? headlineToApply.trim() : CONFIG.noTitle,
      )
      promises.push(saveRecord(newRec))
    }

    const results = await Promise.allSettled(promises)
    const successfulFilenames: string[] = []

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
        successfulFilenames.push((it.value as PhotoType).filename)
      }
    })

    setUploaded(uploaded.filter((item) => !successfulFilenames.includes(item.filename)))
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
      {showEdit && currentEdit && (
        currentEdit.kind === 'video' ? (
          <EditVideoRecord rec={currentEdit} />
        ) : (
          <EditPhotoRecord rec={currentEdit} />
        )
      )}

      {/* File upload form */}
      <form onSubmit={onSubmit}>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Drop zone + file input */}
          <label
            className={`w-full sm:w-auto flex-1 flex flex-col items-center justify-center min-h-[140px] border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-55 dark:hover:bg-gray-800'
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
          <div className="flex flex-col gap-2 min-w-[120px] w-full sm:w-auto">
            {activeTrackerNames.length > 0 && (
              <AppButton label="Cancel all" type="button" color="negative" onClick={cancelAll} />
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
            key={rec.filename}
            className="shrink-0"
            style={{ minWidth: '200px', maxWidth: '300px', flex: 1 }}
          >
            <PictureCard
              rec={rec}
              action={
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <button
                    className="text-white hover:text-red-400 drop-shadow-md hover:scale-110 transition-all p-1"
                    onClick={() => deleteRec(rec)}
                  >
                    <AppIcon name="delete" className="w-6 h-6 leading-none" />
                  </button>
                  <AppCheckbox
                    modelValue={selection.includes(rec.filename)}
                    onChange={(checked) => handleCheckboxChange(!!checked, rec.filename)}
                    className="drop-shadow-md"
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
