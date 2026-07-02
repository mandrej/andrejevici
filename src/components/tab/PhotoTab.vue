<template>
  <EditRecord v-if="showEdit" :rec="currentEdit" />

  <!-- File upload form -->
  <form @submit.prevent="onSubmit">
    <div class="flex flex-col sm:flex-row gap-4 items-start">
      <!-- Drop zone + file input -->
      <label
        class="flex-1 flex flex-col items-center justify-center min-h-[140px] border-2 border-dashed rounded-xl cursor-pointer transition-colors"
        :class="isDragging
          ? 'border-primary bg-primary/5'
          : 'border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800'"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <input
          ref="fileInput"
          type="file"
          name="photos"
          class="hidden"
          multiple
          :accept="CONFIG.fileType"
          @change="onFileChange"
        />
        <span class="material-symbols-rounded text-4xl text-gray-400 dark:text-gray-500 mb-2">cloud_upload</span>
        <span class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ files.length > 0 ? `${files.length} file(s) selected` : 'Drop images here, or click to browse' }}
        </span>
        <span class="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center px-4">
          Max {{ CONFIG.fileMax }} jpg/jpeg/png/gif files, each under {{ formatBytes(CONFIG.fileSize) }}
        </span>
      </label>

      <!-- Action buttons -->
      <div class="flex flex-col gap-2 min-w-[120px]">
        <AppButton
          v-if="trackers.size > 0"
          label="Cancel all"
          type="button"
          color="negative"
          @click="cancelAll"
        />
        <AppButton
          v-if="files.length > 0"
          label="Upload"
          type="submit"
          color="primary"
        />
        <AppButton
          :label="selection.length === 0 ? 'Publish all' : 'Publish selected'"
          @click="publishSelected"
          color="primary"
          :disabled="uploaded.length === 0"
        />
      </div>
    </div>
  </form>

  <!-- Uploaded (unpublished) photo cards -->
  <transition-group tag="div" class="flex flex-wrap gap-4 mt-4" name="fade">
    <div
      v-for="rec in uploaded"
      :key="rec.filename"
      class="flex-shrink-0"
      style="min-width: 200px; max-width: 300px; flex: 1"
    >
      <PictureCard :rec="rec">
        <template #action>
          <div class="absolute top-2 right-2 flex items-center gap-1">
            <button class="bg-white/80 dark:bg-black/60 backdrop-blur-sm rounded-full p-1 text-negative hover:scale-110 transition-transform" @click="deleteRec(rec)">
              <span class="material-symbols-rounded text-xl leading-none">delete</span>
            </button>
            <AppCheckbox v-model="selection" :val="rec.filename" class="bg-white/80 dark:bg-black/60 rounded-full p-1 backdrop-blur-sm" />
            <button class="bg-white/80 dark:bg-black/60 backdrop-blur-sm rounded-full p-1 text-primary hover:scale-110 transition-transform" @click="editRecord(rec)">
              <span class="material-symbols-rounded text-xl leading-none">publish</span>
            </button>
          </div>
        </template>
      </PictureCard>
    </div>
  </transition-group>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import { computed, defineAsyncComponent, onMounted, ref, reactive } from 'vue'
import { storage } from '../../firebase'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { useValuesStore } from '../../stores/values'
import { useUserStore } from '../../stores/user'
import { fakeHistory, formatBytes } from '../../helpers'
import CONFIG from '../../config'
import notify from '../../helpers/notify'
import PictureCard from '../../components/PictureCard.vue'
import { UploadTracker } from '../../helpers/uploadTracker'
import AppButton from '../atoms/AppButton.vue'
import AppCheckbox from '../atoms/AppCheckbox.vue'
import type { UploadTaskSnapshot } from 'firebase/storage'
import type { PhotoType } from '../../helpers/models'

const EditRecord = defineAsyncComponent(() => import('../../components/dialog/EditRecord.vue'))

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const uploaded = computed(() => app.uploaded)
const { showEdit, currentEdit } = storeToRefs(app)
const { headlineToApply, tagsToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)
const selection = ref<string[]>([])
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

interface ValidationErrors {
  file: File
  failedPropValidation: string
}

onMounted(() => {
  app.progressInfo = {}
})

const files = ref<File[]>([])
const trackers = reactive(new Map<string, UploadTracker>())

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  const newFiles = [...input.files]
  const rejected: ValidationErrors[] = []
  for (const f of newFiles) {
    if (CONFIG.fileSize && f.size > CONFIG.fileSize) {
      rejected.push({ file: f, failedPropValidation: 'max-file-size' })
    } else if (files.value.length >= CONFIG.fileMax) {
      rejected.push({ file: f, failedPropValidation: 'max-files' })
    } else {
      files.value.push(f)
    }
  }
  if (rejected.length) onValidationError(rejected)
  if (fileInput.value) fileInput.value.value = ''
}

const onDrop = (e: DragEvent) => {
  isDragging.value = false
  if (!e.dataTransfer?.files) return
  const newFiles = [...e.dataTransfer.files]
  for (const f of newFiles) {
    if (files.value.length < CONFIG.fileMax) files.value.push(f)
  }
}

const cancelAll = (): void => {
  trackers.forEach((tracker) => {
    if (!tracker.isTerminal()) tracker.cancel()
  })
}

const onSubmit = async (): Promise<void> => {
  const promises: Promise<unknown>[] = []

  files.value.forEach((file: File) => {
    const p = uploadTask(file)
      .then((val) => {
        notify({ type: 'positive', message: `Uploaded ${val}.`, icon: 'sym_r_check' })
        if (typeof val === 'string') trackers.delete(val)
        return val
      })
      .catch((err: Error) => {
        notify({
          type: 'warning',
          message: `Rejected ${file.name}.`,
          caption: `Please upload them again.`,
        })
        const reason = err.message
        if (typeof reason === 'string') {
          const tracker = trackers.get(reason)
          if (tracker && !tracker.isTerminal()) tracker.cancel()
          trackers.delete(reason)
        }
        files.value.push(file)
        throw err
      })
    promises.push(p)
  })

  files.value = []
  await Promise.allSettled(promises)
  app.progressInfo = {}
}

const uploadTask = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const id: string = uuidv4().substring(0, 8)
    const filename = `${id}_${file.name}`
    const _ref = storageRef(storage, filename)
    const tracker = new UploadTracker(filename)
    trackers.set(filename, tracker)
    app.progressInfo[filename] = 0

    const uploadTaskObj = uploadBytesResumable(_ref, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=604800',
    })
    tracker.setTask(uploadTaskObj)

    uploadTaskObj.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        tracker.updateProgress(snapshot)
        app.progressInfo[filename] = tracker.progress
      },
      (error: Error) => {
        tracker.markError(error)
        delete app.progressInfo[filename]
        reject(new Error(filename))
      },
      () => {
        getDownloadURL(uploadTaskObj.snapshot.ref)
          .then((downloadURL) => {
            tracker.complete(downloadURL)
            delete app.progressInfo[filename]
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
            if (import.meta.env.DEV) console.log('uploaded', filename)
          })
          .catch((err) => {
            tracker.markError(err)
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

const editRecord = async (rec: PhotoType): Promise<void> => {
  const newRec: PhotoType = await app.completePhoto(
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

const publishSelected = async () => {
  if (selection.value.length === 0) {
    selection.value = app.uploaded.map((item) => item.filename)
  }

  const promises: Promise<unknown>[] = []
  const targets = app.uploaded.filter((item) => selection.value.includes(item.filename))

  for (const rec of targets) {
    const newRec: PhotoType = await app.completePhoto(
      rec,
      tagsToApply.value,
      headlineToApply.value ? headlineToApply.value.trim() : CONFIG.noTitle,
    )
    promises.push(app.saveRecord(newRec))
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
      currentEdit.value = it.value as PhotoType
      successfulFilenames.push((it.value as PhotoType).filename)
    }
  })

  app.uploaded = app.uploaded.filter((item) => !successfulFilenames.includes(item.filename))
  selection.value = []
}
</script>
