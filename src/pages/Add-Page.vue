<template>
  <Edit-Record v-if="showEdit" :rec="currentEdit" />

  <q-page>
    <div class="text-h6 q-pa-md">Upload / publish images</div>

    <q-form @submit="onSubmit">
      <q-item clickable>
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
            style="width: 200px"
            @click="cancelAll"
            v-morph:cancel:buttons:500="morphModel"
          />
          <q-btn
            label="Upload"
            type="submit"
            icon="file_upload"
            color="primary"
            style="width: 200px"
            v-morph:upload:buttons:500="morphModel"
            :disable="files.length === 0"
          />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-linear-progress
            v-for="(value, name) in progressInfo"
            :key="name"
            size="15px"
            :value="value"
            color="warning"
            :style="{ width: 100 / Object.keys(progressInfo).length + '%' }"
          />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-input
            v-model="headlineToApply"
            label="Headline to apply for next publish"
            :hint="`If no headline supplied, '${CONFIG.noTitle}' apply`"
            clearable
          />
        </q-item-section>
      </q-item>
      <q-item clickable>
        <q-item-section
          ><Auto-Complete
            label="Tags to apply for next publish / or to merge with existing"
            v-model="tagsToApply"
            :options="tagsValues"
            canadd
            multiple
            hint="You can add / remove tag later"
            @new-value="addNewTag"
        /></q-item-section>
        <q-item-section side>
          <q-btn
            :label="selection.length === 0 ? 'Publish all' : 'Publish selected'"
            @click="publishSelected"
            color="primary"
            :disable="uploaded.length === 0"
            style="width: 200px"
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
                <q-btn flat round icon="delete" @click="app.deleteRecord(rec)" />
                <q-checkbox v-model="selection" :val="rec.filename" />
                <q-btn flat round icon="publish" @click="editRecord(rec)" />
              </q-card-actions>
            </template>
          </Picture-Card>
        </div>
      </transition-group>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import uuid4 from 'uuid4'
import { computed, defineAsyncComponent, reactive, ref } from 'vue'
import { storage } from '../boot/fire'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import { CONFIG, fakeHistory, completePhoto, nickInsteadEmail } from '../helpers'
import notify from '../helpers/notify'
import PictureCard from '../components/Picture-Card.vue'
import AutoComplete from '../components/Auto-Complete.vue'
import type { UploadTaskSnapshot } from 'firebase/storage'
import type { PhotoType } from 'src/helpers/models'

const EditRecord = defineAsyncComponent(() => import('../components/Edit-Record.vue'))

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const uploaded = computed(() => app.uploaded)
const { showEdit, currentEdit } = storeToRefs(app)
const { tagsValues, headlineToApply, tagsToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)
const selection = ref<string[]>([])

interface Info {
  [key: string]: number
}
interface Task {
  [key: string]: ReturnType<typeof uploadBytesResumable>
}
interface ValidationErrors {
  file: File
  failedPropValidation: string
}

const files = ref([])
const progressInfo: Info = reactive({})
const task: Task = {}
const morphModel = ref('upload')

const cancelAll = (): void => {
  Object.keys(progressInfo).forEach((key: string) => {
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
      delete task[it.reason]
      delete progressInfo[it.reason]
    } else if (it.status === 'fulfilled') {
      notify({ message: `Uploaded ${it.value}.` })
      delete task[it.value as string]
      delete progressInfo[it.value as string]
    }
  })
  morphModel.value = 'upload'
}

const uploadTask = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const id: string = uuid4()
    const filename = `${id}_${file.name}`
    const _ref = storageRef(storage, filename)

    progressInfo[file.name] = 0
    task[file.name] = uploadBytesResumable(_ref, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=604800',
    })
    task[file.name]?.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        progressInfo[file.name] = snapshot.bytesTransferred / snapshot.totalBytes
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (error: Error) => {
        progressInfo[file.name] = 0
        reject(file.name)
      },
      async () => {
        const downloadURL = await getDownloadURL(task[file.name]!.snapshot.ref)
        const data: PhotoType = {
          url: downloadURL,
          filename: filename,
          size: file.size,
          email: user.value!.email,
          nick: nickInsteadEmail(user.value!.email as string),
        }
        uploaded.value.push(data)
        resolve(file.name)
        if (process.env.DEV) console.log('uploaded', file.name)
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

const addNewTag = (inputValue: string, done: (result: string) => void): void => {
  meta.addNewField(inputValue, 'tags')
  done(inputValue)
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

  // Show the edit interface.
  fakeHistory()
  showEdit.value = true

  // Set the current edit record to the new record.
  currentEdit.value = newRec
}

/**
 * Publish selected records
 * Add user email and tags: [] to new rec; read exif
 * See Edit-Record getExif
 */
const publishSelected = async () => {
  // Get selected records or all uploaded records
  const selected =
    selection.value.length === 0
      ? app.uploaded
      : app.uploaded.filter((item) => selection.value.includes(item.filename))

  // Create an array of promises for saving each record
  const promises: Promise<unknown>[] = []
  for (const rec of selected) {
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

  // Remove selected records from uploaded records
  app.uploaded = app.uploaded.filter((item) => !selection.value.includes(item.filename))
  // Clear selection
  selection.value = []
}
</script>
