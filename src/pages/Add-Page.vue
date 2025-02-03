<template>
  <Edit-Record v-if="showEdit" :rec="currentEdit" />

  <q-page v-else class="q-pa-md">
    <div class="relative-position column q-pb-md">
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

    <q-form @submit="onSubmit" class="q-gutter-md">
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
          publish image on site. Accepts maximum 10 jpg (jpeg) files less then 4
          Mb in size."
        @rejected="onValidationError"
      />
      <div class="row justify-end">
        <q-btn
          label="Cancel all"
          type="button"
          color="negative"
          class="col-lg-4 col-sm-5 col-xs-6"
          style="width: 200px"
          @click="cancelAll"
          v-morph:cancel:buttons:500="morphModel"
        />
        <q-btn
          label="Upload"
          type="submit"
          icon="file_upload"
          color="primary"
          class="col-lg-2 col-sm-3 col-xs-4"
          style="width: 200px"
          v-morph:upload:buttons:500="morphModel"
          :disable="files.length === 0"
        />
      </div>
    </q-form>

    <div class="row items-end q-mt-md">
      <div class="col-xs-12 col-sm-8 col-md-8">
        <q-input v-model="headlineToApply" label="Headline to apply for next publish" clearable />
      </div>
      <div class="col-xs-12 col-sm-8 col-md-8">
        <Auto-Complete
          label="Tags to apply / or to merge with existing"
          v-model="tagsToApply"
          :options="tagsValues"
          canadd
          multiple
          hint="You can add / remove tag later"
          @new-value="addNewTag"
        />
      </div>
      <div class="col-xs-12 col-sm-4 col-md-4 text-right">
        <q-btn
          label="Publish all"
          @click="publishAll"
          color="primary"
          :disable="uploaded.length === 0"
          style="width: 200px"
        />
      </div>
    </div>

    <div class="q-mt-md">
      <transition-group tag="div" class="row q-col-gutter-md" name="fade">
        <div
          v-for="rec in uploaded"
          :key="rec.filename"
          class="col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-2"
        >
          <Picture-Card
            :rec="rec"
            :canManage="true"
            @delete-record="app.deleteRecord"
            @edit-record="editRecord"
          />
        </div>
      </transition-group>
    </div>
  </q-page>
</template>

<script setup>
import uuid4 from 'uuid4'
import { defineAsyncComponent, reactive, ref } from 'vue'
import { storage } from '../boot/fire'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import { CONFIG, fakeHistory, emailNick, reFilename } from '../helpers'
import notify from '../helpers/notify'
import readExif from '../helpers/exif'
import PictureCard from '../components/Picture-Card.vue'
import AutoComplete from '../components/Auto-Complete.vue'

const EditRecord = defineAsyncComponent(() => import('../components/Edit-Record.vue'))

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { showEdit, currentEdit, uploaded } = storeToRefs(app)
const { tagsValues, headlineToApply, tagsToApply } = storeToRefs(meta)
const { user } = storeToRefs(auth)

let files = ref([])
let progressInfo = reactive({})
let task = {}
const morphModel = ref('upload')

const alter = (filename) => {
  const id = uuid4()
  const [, name, ext] = filename.match(reFilename)
  return name + '_' + id.substring(id.length - 12) + ext
}

const checkExists = (originalFilename) => {
  const reClean = new RegExp(/[.\s\\){}[\]]+/g)
  const [, name, ext] = originalFilename.match(reFilename)
  let filename = name.replace(/[(]+/g, '_').replace(reClean, '') + ext

  return new Promise((resolve, reject) => {
    getDownloadURL(storageRef(storage, filename))
      .then(() => {
        // exist rename
        filename = alter(filename)
        resolve(filename)
      })
      .catch((error) => {
        if (error.code === 'storage/object-not-found') {
          // does not exist
          resolve(filename)
        } else {
          notify({
            type: 'external',
            html: true,
            message: `${originalFilename}<br/>${error}`,
            actions: [{ icon: 'close' }],
            timeout: 0,
          })
          reject(filename)
        }
      })
  })
}

const cancelAll = () => {
  Object.keys(progressInfo).forEach((it) => {
    task[it].cancel()
  })
  morphModel.value = 'upload'
}
const onSubmit = async (evt) => {
  const promises = []
  const formData = new FormData(evt.target)

  for (const [, file] of formData.entries()) {
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
      notify({
        type: 'positive',
        message: `Uploaded ${it.value}.`,
      })
      delete task[it.value]
      delete progressInfo[it.value]
    }
  })
  morphModel.value = 'upload'
}

/**
 * Uploads a file to the server.
 *
 * @param {File} file - The file to be uploaded.
 */
const uploadTask = (file) => {
  return new Promise((resolve, reject) => {
    checkExists(file.name).then((filename) => {
      progressInfo[file.name] = 0
      const _ref = storageRef(storage, filename)
      task[file.name] = uploadBytesResumable(_ref, file, {
        contentType: file.type,
        cacheControl: 'public, max-age=604800',
      })
      task[file.name].on(
        'state_changed',
        (snapshot) => {
          progressInfo[file.name] = snapshot.bytesTransferred / snapshot.totalBytes
        },
        () => {
          progressInfo[file.name] = 0
          reject(file.name)
        },
        () => {
          getDownloadURL(task[file.name].snapshot.ref).then((downloadURL) => {
            // const urlParams = new URLSearchParams(downloadURL);
            // console.log(urlParams.get("token"));
            const data = {
              url: downloadURL,
              filename: filename,
              size: file.size,
              email: user.value.email,
              nick: emailNick(user.value.email),
            }
            uploaded.value.push(data)
            resolve(file.name)
            if (process.env.DEV) console.log('uploaded', file.name)
          })
        },
      )
    })
  })
}

const onValidationError = (rejectedEntries) => {
  rejectedEntries.forEach((it) => {
    notify({
      type: 'warning',
      message: `${it.file.name}: ${it.failedPropValidation} validation error`,
      actions: [{ icon: 'close' }],
      timeout: 0,
    })
  })
}

const addNewTag = (inputValue, done) => {
  meta.addNewField(inputValue, 'tags')
  done(inputValue)
}

const addProperies = async (rec) => {
  const exif = await readExif(rec.url)
  const tags = [...(tagsToApply.value || '')]
  rec = { ...rec, ...exif }
  rec.headline = headlineToApply.value?.trim() || CONFIG.noTitle
  // add flash tag if exif flash true
  if (rec.flash && tags.indexOf('flash') === -1) {
    tags.push('flash')
  }
  rec.tags = tags
  rec.email = user.value.email
  return rec
}
/**
 * PUBLISH RECORD
 * Add user email and tags: [] to new rec; read exif
 * See Edit-Record getExif
 */
const editRecord = async (rec) => {
  const newRec = await addProperies(rec)
  fakeHistory()
  showEdit.value = true
  currentEdit.value = newRec
}

/**
 * PUBLISH ALL RECORDS
 * Add user email and tags: [] to new rec; read exif
 * See Edit-Record getExif
 */
const publishAll = async () => {
  for (let rec of uploaded.value) {
    const newRec = await addProperies(rec)
    app.saveRecord(newRec)
    currentEdit.value = newRec
    uploaded.value = uploaded.value.filter((item) => item.filename !== rec.filename)
  }
}
</script>
