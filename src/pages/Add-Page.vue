<template>
  <Edit-Record v-if="showEdit" :rec="currentEdit" />

  <q-page class="q-pa-md">
    <div class="text-h6">Upload / publish images</div>
    <div class="relative-position column">
      <div class="row absolute-top">
        <q-linear-progress
          v-for="(value, name) in progressInfo"
          :key="name"
          size="15px"
          :value="value"
          color="warning"
          :style="{ width: 100 / Object.keys(progressInfo).length + '%' }"
        />
      </div>
    </div>

    <q-form @submit="onSubmit">
      <ButtonRow wrap>
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
          class="q-mb-md"
          @rejected="onValidationError"
        />
        <template #button>
          <div class="row justify-end">
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
          </div>
        </template>
      </ButtonRow>
    </q-form>

    <ButtonRow wrap>
      <q-input
        v-model="headlineToApply"
        label="Headline to apply for next publish"
        :hint="`If no headline supplied, '${CONFIG.noTitle}' apply`"
        clearable
      />
      <Auto-Complete
        label="Tags to apply for next publish / or to merge with existing"
        v-model="tagsToApply"
        :options="tagsValues"
        canadd
        multiple
        hint="You can add / remove tag later"
        @new-value="addNewTag"
      />
      <template #button>
        <q-btn
          :label="selection.length === 0 ? 'Publish all' : 'Publish selected'"
          @click="publishSelected"
          color="primary"
          :disable="uploaded.length === 0"
          style="width: 200px"
        />
      </template>
    </ButtonRow>

    <div class="q-mt-md">
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
import { db, storage } from '../boot/fire'
import { doc, setDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import { CONFIG, fakeHistory, emailNick, textSlug, sliceSlug } from '../helpers'
import notify from '../helpers/notify'
import readExif from '../helpers/exif'
import PictureCard from '../components/Picture-Card.vue'
import AutoComplete from '../components/Auto-Complete.vue'
import ButtonRow from 'components/Button-Row.vue'
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

const alter = (filename: string): string => {
  const id: string = uuid4()
  return `${id.slice(24)}_${filename}`
}

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

/**
 * Uploads a file to the server.
 *
 * @param {File} file - The file to be uploaded.
 */
const uploadTask = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const filename = alter(file.name)
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
          nick: emailNick(user.value!.email),
          unbound: true,
        }
        await setDoc(doc(db, 'Photo', data.filename), data)
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

const addProperies = async (rec: PhotoType): Promise<PhotoType> => {
  const exif = await readExif(rec.url)
  const tags = [...(tagsToApply.value || '')]
  rec = { ...rec, ...exif }
  rec.headline = headlineToApply.value?.trim() || CONFIG.noTitle
  rec.text = sliceSlug(textSlug(rec.headline))
  // add flash tag if exif flash true
  if (rec.flash && tags.indexOf('flash') === -1) {
    tags.push('flash')
  }
  rec.tags = tags
  rec.email = user.value!.email
  return rec
}
/**
 * PUBLISH RECORD
 * Add user email and tags: [] to new rec; read exif
 * See Edit-Record getExif
 */
const editRecord = async (rec: PhotoType) => {
  const newRec: PhotoType = await addProperies(rec)
  fakeHistory()
  showEdit.value = true
  currentEdit.value = newRec
}

/**
 * Asynchronously publishes the selected items.
 *
 * This function performs the following steps:
 * 1. Determines the selected items based on the current selection or defaults to all uploaded items if none are selected.
 * 2. Iterates over the selected items, adds properties to each item, and saves the updated records.
 * 3. Updates the current edit state with the new record.
 * 4. Waits for all save operations to complete and handles any rejections by notifying the user.
 * 5. Removes the published items from the uploaded list and clears the selection.
 *
 * @returns {Promise<void>} A promise that resolves when all operations are complete.
 */
const publishSelected = async () => {
  const selected =
    selection.value.length === 0
      ? app.uploaded
      : app.uploaded.filter((item) => selection.value.includes(item.filename))
  const promises: Promise<unknown>[] = []
  for (const rec of selected) {
    const newRec: PhotoType = await addProperies(rec)
    promises.push(app.saveRecord(newRec))
  }
  const results = await Promise.allSettled(promises)
  results.forEach((it) => {
    if (it.status === 'rejected') {
      notify({
        type: 'negative',
        message: `Rejected ${it.reason}.`,
        actions: [{ icon: 'close' }],
        timeout: 0,
      })
    } else {
      currentEdit.value = it.value as PhotoType
    }
  })
  app.uploaded = app.uploaded.filter((item) => !selection.value.includes(item.filename))
  selection.value = []
}
</script>
