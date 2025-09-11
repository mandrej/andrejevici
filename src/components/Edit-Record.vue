<template>
  <q-dialog
    v-model="showEdit"
    :maximized="$q.screen.lt.md"
    transition-show="slide-up"
    transition-hide="slide-down"
    persistent
  >
    <q-card class="q-dialog-plugin full-width" style="max-width: 800px">
      <q-toolbar class="bg-white text-black row justify-between">
        <div>
          <q-btn color="primary" type="submit" label="Save" @click="onSubmit" />
          <q-btn
            v-if="user!.isAdmin"
            class="q-ml-sm gt-sm"
            flat
            label="Read Exif"
            @click="getExif"
          />
        </div>
        <div>{{ formatBytes(tmp.size) }} {{ tmp.dim }}</div>
        <div>
          <q-btn flat round dense icon="close" @click="onCancel" />
        </div>
      </q-toolbar>
      <q-card-section>
        <q-form
          autofocus
          autocorrect="off"
          autocapitalize="off"
          autocomplete="off"
          spellcheck="false"
          @submit="onSubmit"
        >
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-sm-4 gt-xs">
              <q-img :ratio="1" :src="tmp.thumb ? tmp.thumb : tmp.url">
                <template #error>
                  <div class="absolute-full flex flex-center bg-grey">
                    <img :src="fileBroken" style="min-width: 150px; min-height: 150px" />
                  </div>
                </template>
              </q-img>
            </div>
            <div class="col-xs-12 col-sm-8 col-8">
              <q-input
                v-model="tmp.headline"
                label="Headline"
                :hint="`Image without title is called '${CONFIG.noTitle}'`"
                autofocus
                clearable
              />
              <q-input v-model="tmp.filename" label="Filename" readonly />
              <Auto-Complete
                label="Author"
                v-model="tmp.email"
                :options="emailValues"
                canadd
                hint="Existing member can add freind's photo and email"
                :rules="[
                  (val: string) => !!val || 'Email is missing',
                  (val: string) => isValidEmail(val),
                ]"
                @new-value="addNewEmail"
              />
              <q-input v-model="tmp.date" label="Date taken">
                <template #prepend>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="tmp.date" :mask="CONFIG.dateFormat">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
                <template #append>
                  <q-icon name="access_time" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-time v-model="tmp.date" :mask="CONFIG.dateFormat" format24h>
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-time>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="fit row nowrap">
              <div class="col-xs-11">
                <Auto-Complete
                  label="Tags"
                  v-model="tmp.tags"
                  :options="tagsValues"
                  canadd
                  multiple
                  clearable
                  class="col-auto"
                  :hint="tagsToApply && tagsToApply.length ? 'merge with ' + tagsToApply : ''"
                  @new-value="addNewTag"
                >
                </Auto-Complete>
              </div>
              <div class="col self-center text-right">
                <q-icon
                  class="q-pl-sm q-pb-md cursor-pointer"
                  name="content_copy"
                  size="24px"
                  color="grey"
                  @click.stop.prevent="copyTags(tmp.tags || [])"
                />
                <q-icon
                  class="q-pl-sm q-pb-md cursor-pointer"
                  name="content_paste"
                  size="24px"
                  color="grey"
                  @click.stop.prevent="mergeTags(tmp.tags || [])"
                />
              </div>
            </div>
            <div class="col-xs-10"></div>

            <div class="col-xs-2 vertical-bottom text-right"></div>

            <div class="col-xs-12 col-sm-6">
              <Auto-Complete
                label="Camera Model"
                v-model="tmp.model"
                :options="modelValues"
                canadd
                @new-value="addNewModel"
              />
            </div>
            <div class="col-xs-12 col-sm-6">
              <Auto-Complete
                label="Camera Lens"
                v-model="tmp.lens"
                :options="lensValues"
                canadd
                @new-value="addNewLens"
              />
            </div>
            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.focal_length" type="number" label="Focal length [mm]" />
            </div>

            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.iso" type="number" label="ISO [ASA]" />
            </div>
            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.aperture" type="number" step="0.1" label="Aperture" />
            </div>
            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.shutter" label="Shutter [s]" />
            </div>

            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.loc" label="Location [latitude, longitude]" clearable />
            </div>
            <div class="col-xs-6 col-sm-4 col-4 q-mt-sm">
              <q-checkbox v-model="tmp.flash" label="Flash fired?" />
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import {
  CONFIG,
  fileBroken,
  formatBytes,
  U,
  textSlug,
  sliceSlug,
  nickInsteadEmail,
} from '../helpers'
import readExif from '../helpers/exif'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import AutoComplete from './Auto-Complete.vue'
import type { PhotoType } from '../helpers/models'

const emit = defineEmits(['edit-ok'])
const props = defineProps({
  rec: Object,
})

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const tmp = reactive({ ...props.rec }) as PhotoType
const { showEdit, find } = storeToRefs(app)
const { emailValues, tagsValues, tagsToApply, modelValues, lensValues } = storeToRefs(meta)
const { user } = storeToRefs(auth)

const getExif = async () => {
  /**
   * Reread exif
   * See Add edit
   */
  const exif = await readExif(tmp.url)
  if (exif) {
    const tags = tmp.tags || []
    Object.assign(tmp, exif)
    // add flash tag if exif flash true
    if (tmp.flash && tags.indexOf('flash') === -1) {
      tags.push('flash')
    }
    tmp.tags = tags
  }
}
const isValidEmail = (val: string) => {
  const emailPattern =
    /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/
  return emailPattern.test(val) || 'Invalid email'
}

// new values
const addNewEmail = (inputValue: string, done: (value: string) => void) => {
  meta.addNewField(inputValue, 'email')
  done(inputValue)
}
const addNewTag = (inputValue: string, done: (value: string) => void) => {
  meta.addNewField(inputValue, 'tags')
  done(inputValue)
}
const addNewModel = (inputValue: string, done: (value: string) => void) => {
  meta.addNewField(inputValue, 'model')
  done(inputValue)
}
const addNewLens = (inputValue: string, done: (value: string) => void) => {
  meta.addNewField(inputValue, 'lens')
  done(inputValue)
}
const copyTags = (source: string[]) => {
  tagsToApply.value = source
}
const mergeTags = (source: string[]) => {
  if (Array.isArray(source)) {
    tmp.tags = Array.from(new Set([...tagsToApply.value, ...source])).sort()
  } else {
    tmp.tags = tagsToApply.value
  }
}

window.onpopstate = function () {
  showEdit.value = false
}
const onCancel = () => {
  showEdit.value = false
}
const onSubmit = () => {
  // if change date
  const datum = new Date(Date.parse((tmp.date as string) || ''))
  tmp.year = datum.getFullYear()
  tmp.month = datum.getMonth() + 1
  tmp.day = datum.getDate()
  // if change headline
  tmp.headline =
    tmp.headline === undefined || tmp.headline === null ? CONFIG.noTitle : tmp.headline.trim()
  tmp.text = sliceSlug(textSlug(tmp.headline))
  // if change tags
  tmp.tags = tmp.tags ? tmp.tags : []
  // if change email
  tmp.nick = nickInsteadEmail(tmp.email)
  // add flash
  if (tmp.flash && tmp.tags.indexOf('flash') === -1) {
    tmp.tags.push('flash')
  }

  // set find on new added image
  if (!tmp.thumb) {
    find.value = Object.assign({}, { year: tmp.year, month: tmp.month, day: tmp.day })
  }
  app.saveRecord(tmp)
  emit('edit-ok', U + tmp.filename)
  showEdit.value = false
}
</script>
