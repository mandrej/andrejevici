<template>
  <Edit-Record v-if="showEdit" :rec="currentEdit" />

  <div class="text-h6 q-pa-md">Upload / publish images</div>

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
          hint="Drag your images above to upload, or click to browse and select. Then
            publish image on site. Accepts maximum 10 jpg, jpeg, png, or gif files less then 4
            Mb in size."
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
        <Picture-Card :rec="rec">
          ><template #action>
            <q-card-actions class="justify-between">
              <q-btn flat round icon="delete" @click="deleteRec(rec)" />
              <q-checkbox v-model="selection" :val="rec.filename" />
              <q-btn flat round icon="publish" @click="editRecord(rec)" />
            </q-card-actions>
          </template>
        </Picture-Card>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { storage } from 'src/boot/firebase'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import { useUserStore } from 'src/stores/user'
import { fakeHistory, completePhoto } from 'src/helpers'
import CONFIG from 'app/config'
import notify from 'src/helpers/notify'
import PictureCard from 'src/components/Picture-Card.vue'
import TagsMerge from 'src/components/sidebar/Tags-Merge.vue'
import type { UploadTaskSnapshot } from 'firebase/storage'
import type { PhotoType } from 'src/helpers/models'

const EditRecord = defineAsyncComponent(() => import('src/components/dialog/Edit-Record.vue'))

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const uploaded = computed(() => app.uploaded)
const { showEdit, currentEdit } = storeToRefs(app)
const { headlineToApply, tagsToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)
const selection = ref<string[]>([])

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
const onSubmit = async (evt: Event): Promise<void> => {
  const promises: Promise<unknown>[] = []
  const formData = new FormData(evt.target as HTMLFormElement)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [name, file] of formData.entries()) {
    // name = 'photos'
    if (file instanceof File) {
      promises.push(uploadTask(file))
    }
  }

  morphModel.value = 'cancel'
  files.value = []
  const results = await Promise.allSettled(promises)
  results.forEach((it) => {
    if (it.status === 'rejected') {
      notify({
        type: 'negative',
        message: `Rejected ${it.reason}.`,
        actions: [{ icon: 'close' }],
        timeout: 0,
      })
      // Fix: Properly handle unknown type for rejected promise reason
      if (typeof it.reason === 'string') {
        delete task[it.reason]
        delete app.progressInfo[it.reason]
      }
    } else if (it.status === 'fulfilled') {
      notify({ message: `Uploaded ${it.value as string}.` })
      // Fix: Properly handle unknown type for fulfilled promise value
      if (typeof it.value === 'string') {
        delete task[it.value]
        delete app.progressInfo[it.value]
      }
    }
  })
  morphModel.value = 'upload'
}

const uploadTask = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const id: string = uuidv4().substring(0, 8) // 4.3e9 Possibilities
    const filename = `${id}_${file.name}`
    const _ref = storageRef(storage, filename)

    app.progressInfo[file.name] = 0
    task[file.name] = uploadBytesResumable(_ref, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=604800',
    })
    task[file.name]?.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        app.progressInfo[file.name] = snapshot.bytesTransferred / snapshot.totalBytes
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (error: Error) => {
        app.progressInfo[file.name] = 0
        reject(new Error(file.name))
      },
      () => {
        getDownloadURL(task[file.name]!.snapshot.ref)
          .then((downloadURL) => {
            const data: PhotoType = {
              url: downloadURL,
              filename: filename,
              size: file.size,
              email: user.value!.email,
              nick: user.value!.nick,
            }
            uploaded.value.push(data)
            resolve(file.name)
            if (process.env.DEV) console.log('uploaded', file.name)
          })
          .catch(() => {
            reject(new Error(`Failed to get download URL: ${file.name}`))
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
      actions: [{ icon: 'close' }],
      timeout: 0,
    })
  })
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
 * See Edit-Record getExif
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

  // Process the results
  results.forEach((it) => {
    // If promise is rejected, display error message
    if (it.status === 'rejected') {
      notify({
        type: 'negative',
        message: `Rejected ${it.reason}.`,
        actions: [{ icon: 'close' }],
        timeout: 0,
      })
    } else {
      // If promise is fulfilled, update current edit record
      currentEdit.value = it.value as PhotoType
    }
  })

  app.uploaded = app.uploaded.filter((item) => !selection.value.includes(item.filename))
  // Clear selection
  selection.value = []
}
</script>
