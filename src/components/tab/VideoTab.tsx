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
import TagsMerge from '@/components/TagsMerge'
import type { VideoType } from '@/helpers/models'

export const VideoTab: React.FC = () => {
  const saveVideo = useAppStore((state) => state.saveVideo)
  const user = useUserStore((state) => state.user)

  const tagsToApply = useValuesStore((state) => state.tagsToApply)
  const setTagsToApply = (val: string[]) => useValuesStore.setState({ tagsToApply: val })

  const videoFormRef = useRef<HTMLFormElement>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [headline, setHeadline] = useState('')
  const [fetchingTitle, setFetchingTitle] = useState(false)

  const getInitialDateString = () => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }

  const [videoDate, setVideoDate] = useState(getInitialDateString)

  /** Attempt to fetch the YouTube title and auto-fill headline. */
  const autoFillTitle = useCallback(async (url: string) => {
    const ytId = getYouTubeId(url)
    if (!ytId) {
      setHeadline('')
      return
    }
    try {
      setFetchingTitle(true)
      const result = await fetchYouTubeTitle({ videoID: ytId })
      const title = result.data.title
      setHeadline(title || CONFIG.noTitle)
    } catch {
      setHeadline(CONFIG.noTitle)
    } finally {
      setFetchingTitle(false)
    }
  }, [])

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
      id: ytId,
      url: videoUrl,
      email: user?.email || '',
      nick: user?.nick || '',
      headline: headline || CONFIG.noTitle,
      tags: [...tagsToApply],
      text: sliceSlug(headline || CONFIG.noTitle),
      date: formatDatum(datum, CONFIG.dateFormat),
      year: datum.getFullYear(),
      month: datum.getMonth() + 1,
      day: datum.getDate(),
      size: 0,
    }

    try {
      await saveVideo(video)
      setVideoUrl('')
      setHeadline('')
      setVideoDate(getInitialDateString())
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
    <form onSubmit={onVideoSubmit} ref={videoFormRef} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppInput
          modelValue={videoUrl}
          onChangeValue={onUrlChange}
          label="YouTube Video URL"
          hint={fetchingTitle ? 'Fetching title…' : 'Paste the YouTube URL here'}
          loading={fetchingTitle}
          required
        />

        <AppInput
          modelValue={videoDate}
          onChangeValue={setVideoDate}
          label="Recording Date"
          type="datetime-local"
          hint="Select recording date and time"
        />

        <AppInput
          modelValue={headline}
          label="Headline from YouTube"
          placeholder="Fetched automatically"
          readonly
        />

        <TagsMerge label="Tags to apply" hint="You can add / remove tag later" />
      </div>

      <div className="flex justify-end pt-2">
        <AppButton label="Link Video" type="submit" color="primary" className="w-full sm:w-auto" />
      </div>
    </form>
  )
}

export default VideoTab
