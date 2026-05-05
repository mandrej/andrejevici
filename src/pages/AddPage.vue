<template>
  <EditRecord v-if="showEdit" :rec="currentEdit" />

  <q-banner class="q-pa-md">
    <template v-slot:avatar>
      <q-icon :name="addTab === 'photo' ? 'sym_r_upload' : 'sym_r_video_library'" />
    </template>
    <span class="text-h6">{{
      addTab === 'photo' ? 'Upload / publish images' : 'Link videos'
    }}</span>
  </q-banner>

  <template v-if="canAddPhoto">
    <q-tab-panels v-model="addTab" animated>
      <q-tab-panel name="photo" class="q-pa-none">
        <q-form @submit="onSubmit">
          <q-item>
            <q-item-section>
              <q-file
                name="photos"
                v-model="files"
                use-chips
                multiple
                :accept="CONFIG.fileType"
                :max-file-size="CONFIG.fileSize"
                :max-files="CONFIG.fileMax"
                label="Select images to upload"
                :hint="`Drag your images above to upload, or click to browse and select. Then
                  publish image on site. Accepts maximum ${CONFIG.fileMax} jpg, jpeg, png, or gif files
                  less then ${formatBytes(CONFIG.fileSize)} in size.`"
                @rejected="onValidationError"
              />
            </q-item-section>
            <q-item-section side>
              <q-btn
                label="Cancel all"
                type="button"
                color="negative"
                style="width: 120px"
                @click="cancelAll"
                v-morph:cancel:buttons:500="morphModel"
              />
              <q-btn
                label="Upload"
                type="submit"
                color="primary"
                style="width: 120px"
                v-morph:upload:buttons:500="morphModel"
                :disable="files.length === 0"
              />
            </q-item-section>
          </q-item>
          <q-item class="q-mt-md">
            <q-item-section>
              <q-input
                v-model="headlineToApply"
                label="Headline to apply for next publish"
                :hint="`If no headline supplied, '${CONFIG.noTitle}' apply`"
                clearable
              />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <TagsMerge
                :label="`Tags to apply for next publish / or to merge with existing`"
                :hint="`You can add / remove tag later`"
              />
            </q-item-section>
            <q-item-section side>
              <q-btn
                :label="selection.length === 0 ? 'Publish all' : 'Publish selected'"
                @click="publishSelected"
                color="primary"
                :disable="uploaded.length === 0"
                style="width: 120px"
              />
            </q-item-section>
          </q-item>
        </q-form>

        <div class="q-pa-md">
          <transition-group tag="div" class="row q-col-gutter-md" name="fade">
            <div
              v-for="rec in uploaded"
              :key="rec.filename"
              class="col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-2"
            >
              <PictureCard :rec="rec">
                <template #action>
                  <q-card-actions class="justify-between">
                    <q-btn flat round icon="sym_r_delete" @click="deleteRec(rec)" />
                    <q-checkbox v-model="selection" :val="rec.filename" />
                    <q-btn flat round icon="sym_r_publish" @click="editRecord(rec)" />
                  </q-card-actions>
                </template>
              </PictureCard>
            </div>
          </transition-group>
        </div>
      </q-tab-panel>

      <q-tab-panel name="video">
        <q-form ref="videoFormRef" @submit="onVideoSubmit" class="q-pa-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="videoUrl"
                label="YouTube Video URL"
                hint="Paste the YouTube Studio URL here"
              />
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="videoFilename"
                label="Filename / ID"
                hint="A unique identifier for this video (slug)"
              />
            </div>
            <div class="col-12 col-sm-8">
              <q-input
                v-model="headlineToApply"
                label="Headline to apply"
                :hint="`If no headline supplied, '${CONFIG.noTitle}' apply`"
                clearable
              />
            </div>
            <div class="col-12 col-sm-4">
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
          </div>
          <q-item class="q-px-none q-mt-md">
            <q-item-section>
              <TagsMerge label="Tags to apply" hint="You can add / remove tag later" />
            </q-item-section>
            <q-item-section side>
              <q-btn label="Link Video" type="submit" color="primary" style="width: 140px" />
            </q-item-section>
          </q-item>
        </q-form>
      </q-tab-panel>
    </q-tab-panels>
  </template>
  <div v-else class="q-pa-md text-center">
    <q-banner class="bg-warning text-white rounded-borders">
      <template #avatar>
        <q-icon name="sym_r_warning" size="md" />
      </template>
      Only authorized users with a defined nickname can upload photos.
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { storage } from '../firebase'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import { fakeHistory, completePhoto, formatBytes, sliceSlug, formatDatum } from '../helpers'
import CONFIG from '../config'
import notify from '../helpers/notify'
import PictureCard from '../components/PictureCard.vue'
import TagsMerge from '../components/sidebar/TagsMerge.vue'
import type { UploadTaskSnapshot } from 'firebase/storage'
import type { PhotoType, VideoType } from '../helpers/models'
import type { QForm } from 'quasar'

const EditRecord = defineAsyncComponent(() => import('../components/dialog/EditRecord.vue'))

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const uploaded = computed(() => app.uploaded)
const { showEdit, currentEdit, addTab } = storeToRefs(app)
const { headlineToApply, tagsToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)
const selection = ref<string[]>([])
const canAddPhoto = computed(() => !!user.value?.isAuthorized && !!user.value?.nick)

const videoUrl = ref('')
const videoFilename = ref('')
const videoDate = ref(formatDatum(new Date(), 'YYYY-MM-DD HH:mm'))
const videoFormRef = ref<InstanceType<typeof QForm> | null>(null)

interface Task {
  [key: string]: ReturnType<typeof uploadBytesResumable>
}
interface ValidationErrors {
  file: File
  failedPropValidation: string
}

onMounted(() => {
  app.progressInfo = {}
})

const files = ref([])
const task: Task = {}
const morphModel = ref('upload')

const cancelAll = (): void => {
  Object.keys(app.progressInfo).forEach((key: string) => {
    if (task[key]) {
      task[key].cancel()
    }
  })
  morphModel.value = 'upload'
}
const onSubmit = async (): Promise<void> => {
  morphModel.value = 'cancel'
  const promises: Promise<unknown>[] = []

  files.value.forEach((file: File) => {
    const p = uploadTask(file)
      .then((val) => {
        notify({ type: 'positive', message: `Uploaded ${val}.`, icon: 'sym_r_check' })
        if (typeof val === 'string') {
          delete task[val]
          delete app.progressInfo[val]
        }
        return val
      })
      .catch((err: Error) => {
        notify({
          type: 'negative',
          message: `Rejected ${err.message}.`,
          actions: [{ icon: 'sym_r_close' }],
          timeout: 0,
        })
        const reason = err.message
        if (typeof reason === 'string') {
          if (task[reason]) {
            task[reason].cancel()
            delete task[reason]
          }
          delete app.progressInfo[reason]
        }
        throw err
      })
    promises.push(p)
  })

  files.value = []
  await Promise.allSettled(promises)
  morphModel.value = 'upload'
}

const uploadTask = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const id: string = uuidv4().substring(0, 8) // 4.3e9 Possibilities
    const filename = `${id}_${file.name}`
    const _ref = storageRef(storage, filename)

    app.progressInfo[filename] = 0
    task[filename] = uploadBytesResumable(_ref, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=604800',
    })
    task[filename]?.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        app.progressInfo[filename] = snapshot.bytesTransferred / snapshot.totalBytes
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (error: Error) => {
        task[filename]?.cancel()
        app.progressInfo[filename] = 0
        reject(new Error(filename))
      },
      () => {
        getDownloadURL(task[filename]!.snapshot.ref)
          .then((downloadURL) => {
            const data: PhotoType = {
              url: downloadURL,
              filename: filename,
              size: file.size,
              email: user.value!.email,
              nick: user.value!.nick,
              kind: 'photo',
            }
            uploaded.value.push(data)
            resolve(filename)
            if (process.env.DEV) console.log('uploaded', filename)
          })
          .catch(() => {
            reject(new Error(`Failed to get download URL: ${filename}`))
          })
      },
    )
  })
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

/**
 * Edit a record.
 *
 * @param {PhotoType} rec - The record to edit.
 * @returns {Promise<void>} - A promise that resolves when the edit is complete.
 */
const editRecord = async (rec: PhotoType): Promise<void> => {
  const newRec: PhotoType = await completePhoto(
    rec,
    tagsToApply.value,
    headlineToApply.value ? headlineToApply.value.trim() : CONFIG.noTitle,
  )
  fakeHistory()
  showEdit.value = true
  currentEdit.value = newRec
}

const deleteRec = (rec: PhotoType): void => {
  selection.value = selection.value.filter((item) => item !== rec.filename)
  app.deleteRecord(rec)
}

/**
 * Publish selected records
 * Add user email and tags: [] to new rec; read exif
 * See EditRecord getExif
 */
const publishSelected = async () => {
  if (selection.value.length === 0) {
    selection.value = app.uploaded.map((item) => item.filename)
  }

  const promises: Promise<unknown>[] = []
  const targets = app.uploaded.filter((item) => selection.value.includes(item.filename))

  for (const rec of targets) {
    const newRec: PhotoType = await completePhoto(
      rec,
      tagsToApply.value,
      headlineToApply.value ? headlineToApply.value.trim() : CONFIG.noTitle,
    )
    promises.push(app.saveRecord(newRec))
  }

  // Wait for all promises to settle
  const results = await Promise.allSettled(promises)

  const successfulFilenames: string[] = []

  // Process the results
  results.forEach((it) => {
    // If promise is rejected, display error message
    if (it.status === 'rejected') {
      notify({
        type: 'negative',
        message: `Rejected ${it.reason}.`,
        actions: [{ icon: 'sym_r_close' }],
        timeout: 0,
      })
    } else {
      // If promise is fulfilled, update current edit record
      currentEdit.value = it.value as PhotoType
      successfulFilenames.push((it.value as PhotoType).filename)
    }
  })

  app.uploaded = app.uploaded.filter((item) => !successfulFilenames.includes(item.filename))
  // Clear selection
  selection.value = []
}
</script>
