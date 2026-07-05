<template>
  <form @submit.prevent="onVideoSubmit" ref="videoFormRef">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <AppInput
          v-model="videoUrl"
          label="YouTube Video URL"
          hint="Paste the YouTube URL here"
          required
        />
      </div>

      <div>
        <AppInput
          v-model="videoDate"
          label="Recording Date"
          type="datetime-local"
          hint="Select recording date and time"
        />
      </div>
      <div class="self-end flex justify-end">
        <AppButton label="Link Video" type="submit" color="primary" />
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { useValuesStore } from '../../stores/values'
import { useUserStore } from '../../stores/user'
import { sliceSlug, formatDatum, getYouTubeId } from '../../helpers'
import CONFIG from '../../config'
import notify from '../../helpers/notify'
import AppInput from '../atoms/AppInput.vue'
import AppButton from '../atoms/AppButton.vue'
import type { VideoType } from '../../helpers/models'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { headlineToApply, tagsToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)
const videoFormRef = ref<HTMLFormElement | null>(null)

const videoUrl = ref('')

// datetime-local format: YYYY-MM-DDThh:mm
const videoDate = ref(
  (() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  })(),
)

/**
 * Validates the form and saves the video record to Firestore.
 */
const onVideoSubmit = async () => {
  if (!videoUrl.value || !videoDate.value) return
  if (!videoFormRef.value?.checkValidity()) {
    videoFormRef.value?.reportValidity()
    return
  }

  const ytId = getYouTubeId(videoUrl.value)
  if (!ytId) {
    notify({ type: 'negative', message: 'Invalid YouTube URL' })
    return
  }

  const datum = new Date(videoDate.value)
  const video: VideoType = {
    url: videoUrl.value,
    filename: ytId,
    email: user.value!.email,
    nick: user.value!.nick,
    headline: headlineToApply.value || CONFIG.noTitle,
    tags: [...tagsToApply.value],
    text: sliceSlug(headlineToApply.value || CONFIG.noTitle),
    date: formatDatum(datum, CONFIG.dateFormat),
    year: datum.getFullYear(),
    month: datum.getMonth() + 1,
    day: datum.getDate(),
    size: 0,
  }

  try {
    await app.saveVideo(video)
    videoUrl.value = ''

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    videoDate.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    headlineToApply.value = ''
    tagsToApply.value = []
    videoFormRef.value?.reset()
    notify({ type: 'positive', message: 'Video published successfully' })
  } catch (err) {
    notify({ type: 'negative', message: `Failed to publish video: ${(err as Error).message}` })
  }
}
</script>
