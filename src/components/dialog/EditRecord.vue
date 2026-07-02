<template>
  <AppDialog v-model="showEdit" max-width="max-w-3xl">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-2">
        <AppButton type="button" color="primary" label="Save" @click="onSubmit" />
        <AppButton
          v-if="user!.isAdmin && tmp.kind !== 'video'"
          flat
          label="Read Exif"
          @click="getExif"
          class="hidden sm:inline-flex"
        />
      </div>
      <span v-if="tmp.kind !== 'video'" class="text-xs text-gray-500 dark:text-gray-400">
        {{ formatBytes(tmp.size) }} {{ tmp.dim }}
      </span>
      <button class="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" @click="onCancel">
        <AppIcon name="close" class="w-6 h-6" />
      </button>
    </div>

    <!-- Content -->
    <div class="p-4 overflow-y-auto max-h-[85vh]">
      <form
        autocorrect="off"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        @submit.prevent="onSubmit"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Thumbnail preview -->
          <div class="hidden sm:block sm:col-span-1">
            <div class="relative w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800" style="padding-top: 100%">
              <img
                :src="thumbUrl"
                :alt="tmp.headline"
                class="absolute inset-0 w-full h-full object-cover"
                @error="imgError = true"
              />
              <FileBroken v-if="imgError" />
            </div>
          </div>

          <!-- Fields -->
          <div class="flex flex-col gap-3 sm:col-span-1">
            <AppInput
              v-model="tmp.headline"
              label="Headline"
              :hint="`Without title: '${CONFIG.noTitle}'`"
              clearable
              autofocus
            />
            <AppInput v-model="tmp.filename" label="Filename" readonly />
            <AppInput
              v-if="tmp.kind === 'video'"
              v-model="tmp.url"
              label="Video URL"
              hint="YouTube link"
              required
            />
            <AutoComplete
              label="Author"
              v-model="tmp.email"
              :options="emailValues"
              hint="Admin can add friend's photo and email"
            />
            <AppInput
              v-model="tmp.date"
              label="Date taken"
              type="datetime-local"
            />
          </div>

          <!-- Tags row (full width) -->
          <div class="sm:col-span-2 flex items-start gap-2">
            <div class="flex-1">
              <AutoComplete
                label="Tags"
                v-model="tmp.tags"
                :options="tagsValues"
                canadd
                multiple
                :hint="tagsToApply && tagsToApply.length ? 'merge with ' + tagsToApply : ''"
                @new-value="(value: string, done: (v: string) => void) => meta.addNewValue(value, 'tags', done)"
              />
            </div>
            <div class="flex flex-col gap-1 mt-1">
              <button
                type="button"
                class="text-gray-400 hover:text-primary transition-colors"
                title="Copy tags"
                @click.stop.prevent="copyTags(tmp.tags || [])"
              >
                <AppIcon name="content_copy" class="w-5 h-5" />
              </button>
              <button
                type="button"
                class="text-gray-400 hover:text-primary transition-colors"
                title="Paste tags"
                @click.stop.prevent="mergeTags(tmp.tags || [])"
              >
                <AppIcon name="content_paste" class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Photo-only EXIF fields -->
          <template v-if="tmp.kind !== 'video'">
            <AutoComplete
              label="Camera Model"
              v-model="tmp.model"
              :options="modelValues"
              canadd
              @new-value="(value: string, done: (v: string) => void) => meta.addNewValue(value, 'model', done)"
            />
            <AutoComplete
              label="Camera Lens"
              v-model="tmp.lens"
              :options="lensValues"
              canadd
              @new-value="(value: string, done: (v: string) => void) => meta.addNewValue(value, 'lens', done)"
            />
            <AppInput v-model="tmp.focal_length" type="number" label="Focal length [mm]" />
            <AppInput v-model="tmp.iso" type="number" label="ISO [ASA]" />
            <AppInput v-model="tmp.aperture" type="number" step="0.1" label="Aperture" />
            <AppInput v-model="tmp.shutter" label="Shutter [s]" />
            <AppInput v-model="tmp.loc" label="Location [lat, lon]" clearable />
            <div class="flex items-center gap-2 mt-2">
              <AppCheckbox v-model="tmp.flash" label="Flash fired?" />
            </div>
          </template>
        </div>
      </form>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { U, formatBytes, sliceSlug, getYouTubeId } from '../../helpers'
import CONFIG from '../../config'
import readExif from '../../helpers/exif'
import notify from '../../helpers/notify'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { useValuesStore } from '../../stores/values'
import { useUserStore } from '../../stores/user'
import AutoComplete from '../AutoComplete.vue'
import FileBroken from '../FileBroken.vue'
import AppDialog from '../atoms/AppDialog.vue'
import AppButton from '../atoms/AppButton.vue'
import AppInput from '../atoms/AppInput.vue'
import AppCheckbox from '../atoms/AppCheckbox.vue'
import AppIcon from '../atoms/AppIcon.vue'
import type { PhotoType } from '../../helpers/models'

const emit = defineEmits(['editOk'])
const props = defineProps({ rec: Object })

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const tmp = reactive({ ...props.rec }) as PhotoType
const originalUrl = props.rec?.url || ''
const imgError = ref(false)
const { showEdit } = storeToRefs(app)
const { tagsValues, tagsToApply, modelValues, lensValues, emailValues } = storeToRefs(meta)
const { user } = storeToRefs(auth)

const thumbUrl = computed(() => {
  if (tmp.thumb) return tmp.thumb
  if (tmp.kind === 'video') {
    const id = getYouTubeId(tmp.url)
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
  }
  return tmp.url
})

/**
 * Re-reads EXIF metadata from the current photo URL and merges it into the
 * editable record. Also appends the `'flash'` tag when EXIF reports flash fired.
 */
const getExif = async () => {
  const exif = await readExif(tmp.url)
  if (exif) {
    const tags = tmp.tags || []
    Object.assign(tmp, exif)
    if (tmp.flash && tags.indexOf('flash') === -1) tags.push('flash')
    tmp.tags = tags
  }
}

/**
 * Validates that the given string is a well-formed email address.
 */
const isValidEmail = (val: string) => {
  const emailPattern =
    /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/
  return emailPattern.test(val) || 'Invalid email'
}

/**
 * Copies the given tag array to `tagsToApply`.
 */
const copyTags = (source: string[]) => { tagsToApply.value = source }

/**
 * Merges `tagsToApply` into the current record's tags.
 */
const mergeTags = (source: string[]) => {
  if (Array.isArray(source)) {
    tmp.tags = Array.from(new Set([...tagsToApply.value, ...source])).sort()
  } else {
    tmp.tags = tagsToApply.value
  }
}

window.onpopstate = function () { showEdit.value = false }

const onCancel = () => { showEdit.value = false }

/**
 * Validates and saves the edited record.
 */
const onSubmit = async () => {
  const datum = new Date(Date.parse((tmp.date as string) || ''))
  tmp.year = datum.getFullYear()
  tmp.month = datum.getMonth() + 1
  tmp.day = datum.getDate()
  tmp.headline = tmp.headline?.trim() || CONFIG.noTitle
  tmp.text = sliceSlug(tmp.headline)

  if (tmp.email !== user.value!.email && user.value!.isAdmin) {
    try {
      tmp.nick = await auth.getNickByEmail(tmp.email)
    } catch (error) {
      notify({ type: 'negative', message: String(error) })
      return
    }
  } else {
    tmp.email = user.value!.email
    tmp.nick = user.value!.nick
  }

  if (tmp.kind === 'video' && tmp.url !== originalUrl) {
    const id = getYouTubeId(tmp.url)
    tmp.thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
  }

  tmp.tags = tmp.tags ? tmp.tags : []
  if (tmp.flash && tmp.tags.indexOf('flash') === -1) tmp.tags.push('flash')

  // email validation check
  const emailValid = isValidEmail(tmp.email)
  if (typeof emailValid === 'string') {
    notify({ type: 'negative', message: emailValid })
    return
  }

  try {
    app.saveRecord(tmp)
    emit('editOk', U + tmp.filename)
    showEdit.value = false
  } catch (error) {
    console.error('Failed to save record:', error)
  }
}
</script>
