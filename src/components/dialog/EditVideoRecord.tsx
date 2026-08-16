'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '@/stores/appStore'
import { getYouTubeId, fetchYouTubeTitle, toDateTimeLocalString } from '@/helpers'
import CONFIG from '@/config'
import notify from '@/helpers/notify'
import type { PhotoType } from '@/helpers/models'
import type { Timestamp } from 'firebase/firestore'
import AutoComplete from '@/components/AutoComplete'
import FileBroken from '@/components/FileBroken'
import AppDialog from '@/components/atoms/AppDialog'
import AppButton from '@/components/atoms/AppButton'
import AppInput from '@/components/atoms/AppInput'
import AppIcon from '@/components/atoms/AppIcon'
import { useEditRecord } from '@/hooks/useEditRecord'

interface EditVideoRecordProps {
  rec: PhotoType
  onEditOk?: (id: string) => void
}

export const EditVideoRecord: React.FC<EditVideoRecordProps> = ({ rec, onEditOk }) => {
  const {
    showEdit,
    setShowEdit,
    saveRecord,
    user: _user,
    tagsValues,
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
  const [fetchingTitle, setFetchingTitle] = useState(false)
  const prevUrlRef = useRef(rec.url)

  useEffect(() => {
    if (!tmp.url) return
    const id = getYouTubeId(tmp.url)
    if (id) {
      setTmp((prev) => ({
        ...prev,
        id: id,
        thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      }))

      // Fetch headline when the URL changed to a different video
      if (tmp.url !== prevUrlRef.current) {
        prevUrlRef.current = tmp.url
        setFetchingTitle(true)
        fetchYouTubeTitle({ videoID: id })
          .then((result) => {
            const title = result.data.title
            setTmp((prev) => ({ ...prev, headline: title || CONFIG.noTitle }))
          })
          .catch(() => {
            setTmp((prev) => ({ ...prev, headline: CONFIG.noTitle }))
          })
          .finally(() => setFetchingTitle(false))
      }
    } else {
      setTmp((prev) => ({ ...prev, thumb: '' }))
    }
  }, [tmp.url])

  const thumbUrl = useMemo(() => {
    if (tmp.thumb) return tmp.thumb
    const id = getYouTubeId(tmp.url)
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    return tmp.url
  }, [tmp.thumb, tmp.url])

  const onCancel = () => {
    setShowEdit(false)
  }

  const onSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    try {
      let recordToSave = await prepareRecord(tmp)

      if (recordToSave.url !== rec.url) {
        const id = getYouTubeId(recordToSave.url)
        recordToSave.thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
      }

      if (recordToSave.id !== rec.id) {
        try {
          const { photoCollection } = await import('@/helpers/collections')
          const { doc, deleteDoc } = await import('firebase/firestore')
          const oldId = rec.id
          await deleteDoc(doc(photoCollection, oldId))
          useAppStore.setState((state) => ({
            objects: state.objects.filter((x) => x.id !== oldId),
          }))
        } catch (err) {
          console.error('Failed to delete old video document:', err)
        }
      }

      await saveRecord(recordToSave)
      if (onEditOk) {
        onEditOk(recordToSave.id)
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
        </div>
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
                label="Headline from YouTube"
                hint={fetchingTitle ? 'Fetching title…' : `Without title: '${CONFIG.noTitle}'`}
                loading={fetchingTitle}
                readonly
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <AppInput
                modelValue={tmp.url}
                onChangeValue={(val) => setTmp((prev) => ({ ...prev, url: val }))}
                label="Video URL"
                hint="YouTube link"
                required
              />
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
                modelValue={toDateTimeLocalString(tmp.date)}
                onChangeValue={(val) => setTmp((prev) => ({ ...prev, date: val as unknown as Timestamp }))}
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

            <input type="hidden" name="id" value={tmp.id || ''} />
          </div>
        </form>
      </div>
    </AppDialog>
  )
}

export default EditVideoRecord
