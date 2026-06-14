<template>
  <EditRecord v-if="showEdit" :rec="currentEdit" />

  <q-form @submit="onSubmit">
    <q-item class="q-pa-none">
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
      <q-item-section side class="q-gutter-sm">
        <q-btn
          v-if="trackers.size > 0"
          label="Cancel all"
          type="button"
          color="negative"
          style="width: 120px"
          @click="cancelAll"
        />
        <q-btn
          v-if="files.length > 0"
          label="Upload"
          type="submit"
          color="primary"
          style="width: 120px"
        />
      </q-item-section>
    </q-item>
    <div class="row q-py-md q-mt-md justify-end">
      <q-btn
        :label="selection.length === 0 ? 'Publish all' : 'Publish selected'"
        @click="publishSelected"
        color="primary"
        :disable="uploaded.length === 0"
        style="width: 120px"
      />
    </div>
  </q-form>

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

interface ValidationErrors {
  file: File
  failedPropValidation: string
}

onMounted(() => {
  app.progressInfo = {}
})

const files = ref<File[]>([])
const trackers = reactive(new Map<string, UploadTracker>())

/**
 * Cancels all active (non-terminal) upload tasks tracked in the `trackers` map.
 */
const cancelAll = (): void => {
  trackers.forEach((tracker) => {
    if (!tracker.isTerminal()) {
      tracker.cancel()
    }
  })
}

/**
 * Handles the upload form submission. Initiates an upload task for each
 * selected file, shows success/failure notifications, and cleans up state
 * once all uploads settle.
 */
const onSubmit = async (): Promise<void> => {
  const promises: Promise<unknown>[] = []

  files.value.forEach((file: File) => {
    const p = uploadTask(file)
      .then((val) => {
        notify({ type: 'positive', message: `Uploaded ${val}.`, icon: 'sym_r_check' })
        if (typeof val === 'string') {
          trackers.delete(val)
        }
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
          if (tracker && !tracker.isTerminal()) {
            tracker.cancel()
          }
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

/**
 * Uploads a single file to Firebase Storage with resumable upload support.
 * Tracks progress via an {@link UploadTracker}, updates `app.progressInfo`,
 * and appends the resulting photo record to `app.uploaded` on success.
 *
 * @param file - The `File` object to upload.
 * @returns A promise that resolves with the stored filename on success,
 *   or rejects with an `Error` whose message is the filename on failure.
 */
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
            if (process.env.DEV) console.log('uploaded', filename)
          })
          .catch((err) => {
            tracker.markError(err)
            reject(new Error(`Failed to get download URL: ${filename}`))
          })
      },
    )
  })
}

/**
 * Displays a persistent warning notification for each file that failed
 * Quasar's file-input validation (size, type, or count constraints).
 *
 * @param rejectedEntries - Array of rejection descriptors containing the
 *   rejected `File` and the name of the failed validation property.
 */
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

/**
 * Enriches the given photo record with EXIF metadata and global tag/headline
 * defaults, then opens the {@link EditRecord} dialog for manual editing.
 *
 * @param rec - The uploaded photo record to edit.
 */
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

/**
 * Removes a photo record from the upload queue and deselects it if it was
 * part of the current selection.
 *
 * @param rec - The photo record to delete.
 */
const deleteRec = (rec: PhotoType): void => {
  selection.value = selection.value.filter((item) => item !== rec.filename)
  app.deleteRecord(rec)
}

/**
 * Publishes the selected uploaded photos (or all of them when nothing is
 * explicitly selected). Each record is first enriched via `completePhoto`,
 * then saved to Firestore. Successfully published records are removed from
 * the upload queue; failures are reported as notifications.
 */
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
