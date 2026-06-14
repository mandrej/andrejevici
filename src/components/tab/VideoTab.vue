<template>
  <q-form ref="videoFormRef" @submit="onVideoSubmit">
    <div class="row q-col-gutter-md">
      <div class="col-12 col-sm-6">
        <q-input
          v-model="videoUrl"
          label="YouTube Video URL"
          hint="Paste the YouTube URL here"
          :rules="[(val: string) => !!val || 'Video URL is required']"
        />
      </div>
      <div class="col-12 col-sm-6">
        <q-input
          v-model="videoFilename"
          label="Filename"
          hint="A filename for this video"
          :rules="[(val: string) => !!val || 'Filename is required']"
        />
      </div>
      <div class="col-12 col-sm-6">
        <q-input v-model="videoDate" label="Recording Date">
          <template v-slot:prepend>
            <q-icon name="sym_r_event" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-date v-model="videoDate" mask="YYYY-MM-DD HH:mm">
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup label="Close" color="primary" flat />
                  </div>
                </q-date>
              </q-popup-proxy>
            </q-icon>
          </template>
          <template v-slot:append>
            <q-icon name="sym_r_access_time" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-time v-model="videoDate" mask="YYYY-MM-DD HH:mm" format24h>
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup label="Close" color="primary" flat />
                  </div>
                </q-time>
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 self-center text-right">
        <q-btn label="Link Video" type="submit" color="primary" style="width: 140px" />
      </div>
    </div>
  </q-form>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { useValuesStore } from '../../stores/values'
import { useUserStore } from '../../stores/user'
import { sliceSlug, formatDatum } from '../../helpers'
import CONFIG from '../../config'
import notify from '../../helpers/notify'

import type { VideoType } from '../../helpers/models'
import type { QForm } from 'quasar'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { headlineToApply, tagsToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)

const videoUrl = ref('')
const videoFilename = ref('')
const videoDate = ref(formatDatum(new Date(), 'YYYY-MM-DD HH:mm'))
const videoFormRef = ref<InstanceType<typeof QForm> | null>(null)

/**
 * Validates the form and saves the video record to Firestore. Constructs a
 * {@link VideoType} from the input fields, calls `app.saveVideo`, then resets
 * all form fields and triggers a success notification.
 */
const onVideoSubmit = async () => {
  if (!videoUrl.value || !videoFilename.value || !videoDate.value) return

  const datum = new Date(videoDate.value)
  const video: VideoType = {
    url: videoUrl.value,
    filename: `${uuidv4().substring(0, 8)}_${videoFilename.value}`,
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
    videoFilename.value = ''
    videoDate.value = formatDatum(new Date(), 'YYYY-MM-DD HH:mm')
    headlineToApply.value = ''
    tagsToApply.value = []

    if (videoFormRef.value) {
      videoFormRef.value.resetValidation()
    }

    notify({ type: 'positive', message: 'Video published successfully' })
  } catch (err) {
    notify({ type: 'negative', message: `Failed to publish video: ${(err as Error).message}` })
  }
}
</script>
