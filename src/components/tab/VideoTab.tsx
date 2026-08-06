'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useValuesStore } from '@/stores/valuesStore'
import { useUserStore } from '@/stores/userStore'
import { sliceSlug, formatDatum, getYouTubeId, fetchYouTubeTitle } from '@/helpers'
import CONFIG from '@/config'
import notify from '@/helpers/notify'
import AppInput from '@/components/atoms/AppInput'
import AppButton from '@/components/atoms/AppButton'
import type { VideoType } from '@/helpers/models'

export const VideoTab: React.FC = () => {
  const saveVideo = useAppStore((state) => state.saveVideo)
  const user = useUserStore((state) => state.user)

  const headlineToApply = useValuesStore((state) => state.headlineToApply)
  const setHeadlineToApply = (val: string) => useValuesStore.setState({ headlineToApply: val })
  const tagsToApply = useValuesStore((state) => state.tagsToApply)
  const setTagsToApply = (val: string[]) => useValuesStore.setState({ tagsToApply: val })

  const videoFormRef = useRef<HTMLFormElement>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [fetchingTitle, setFetchingTitle] = useState(false)

  const getInitialDateString = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }

  const [videoDate, setVideoDate] = useState(getInitialDateString)

  /** Attempt to fetch the YouTube title and auto-fill headline if empty. */
  const autoFillTitle = useCallback(
    async (url: string) => {
      const ytId = getYouTubeId(url)
      if (!ytId) return
      // Only auto-fill when headline is currently blank
      const currentHeadline = useValuesStore.getState().headlineToApply
      if (currentHeadline) return
      try {
        setFetchingTitle(true)
        const result = await fetchYouTubeTitle({ videoID: ytId })
        const title = result.data.title
        if (title && !useValuesStore.getState().headlineToApply) {
          setHeadlineToApply(title)
        }
      } catch {
        // silently ignore — user can still fill in manually
      } finally {
        setFetchingTitle(false)
      }
    },
    [],
  )

  const onUrlChange = useCallback(
    (url: string) => {
      setVideoUrl(url)
      autoFillTitle(url)
    },
    [autoFillTitle],
  )

  const onVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoUrl || !videoDate) return
    if (videoFormRef.current && !videoFormRef.current.checkValidity()) {
      videoFormRef.current.reportValidity()
      return
    }

    const ytId = getYouTubeId(videoUrl)
    if (!ytId) {
      notify({ type: 'negative', message: 'Invalid YouTube URL' })
      return
    }

    const datum = new Date(videoDate)
    const video: VideoType = {
      url: videoUrl,
      filename: ytId,
      email: user?.email || '',
      nick: user?.nick || '',
      headline: headlineToApply || CONFIG.noTitle,
      tags: [...tagsToApply],
      text: sliceSlug(headlineToApply || CONFIG.noTitle),
      date: formatDatum(datum, CONFIG.dateFormat),
      year: datum.getFullYear(),
      month: datum.getMonth() + 1,
      day: datum.getDate(),
      size: 0,
    }

    try {
      await saveVideo(video)
      setVideoUrl('')
      setVideoDate(getInitialDateString())
      setHeadlineToApply('')
      setTagsToApply([])
      notify({ type: 'positive', message: 'Video published successfully' })
    } catch (err) {
      notify({
        type: 'negative',
        message: `Failed to publish video: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  return (
    <form onSubmit={onVideoSubmit} ref={videoFormRef}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <AppInput
            modelValue={videoUrl}
            onChangeValue={onUrlChange}
            label="YouTube Video URL"
            hint={fetchingTitle ? 'Fetching title…' : 'Paste the YouTube URL here'}
            loading={fetchingTitle}
            required
          />
        </div>

        <div>
          <AppInput
            modelValue={videoDate}
            onChangeValue={setVideoDate}
            label="Recording Date"
            type="datetime-local"
            hint="Select recording date and time"
          />
        </div>

        <div className="self-end lg:self-center flex justify-end sm:col-start-2 lg:col-start-auto">
          <AppButton label="Link Video" type="submit" color="primary" />
        </div>
      </div>
    </form>
  )
}

export default VideoTab
