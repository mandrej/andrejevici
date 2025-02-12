<template>
  <div class="q-pa-md">
    <div class="text-h6">Tags</div>
    <ButtonRow>
      <q-input
        ref="newTagRef"
        v-model="newTag"
        label="Add new tag"
        :rules="[(val) => tagsValues.indexOf(val) === -1 || 'Tag already in use']"
        clearable
      />
      <template #button>
        <q-btn label="Add" @click="addTag" color="primary" />
      </template>
    </ButtonRow>
    <ButtonRow>
      <div class="row">
        <Auto-Complete
          label="Rename tag"
          v-model="existingTag"
          :options="tagsValues"
          class="col q-mr-md"
        />
        <q-input
          v-model="changedTag"
          label="to tag"
          clearable
          :rules="[(val) => val.indexOf('/') === -1 || 'Cannot use / here']"
          class="col"
        />
      </div>
      <template #button>
        <q-btn label="Rename" @click="rename('tags', existingTag, changedTag)" color="primary" />
      </template>
    </ButtonRow>
    <ButtonRow>
      <q-item-section> Remove unused tags</q-item-section>
      <template #button>
        <q-btn label="Remove" @click="removeTags" color="primary" />
      </template>
    </ButtonRow>

    <q-scroll-area class="gt-xs" style="height: 50vh">
      <div class="text-subtitle1">
        <router-link
          v-for="(count, value) in tagsWithCount"
          :key="value"
          :title="`${value}: ${count}`"
          :to="{ path: '/list', query: { tags: value } }"
          class="q-pr-sm link"
          >{{ value }},</router-link
        >
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useValuesStore } from '../stores/values'
import AutoComplete from '../components/Auto-Complete.vue'
import { rename } from '../helpers/remedy'
import notify from '../helpers/notify'
import ButtonRow from './Button-Row.vue'
import type { QInput } from 'quasar'

const meta = useValuesStore()
const { tagsValues, tagsWithCount } = storeToRefs(meta)

const values = computed(() => meta.values)
const newTagRef = ref<InstanceType<typeof QInput> | null>(null),
  newTag = ref(''),
  existingTag = ref(''),
  changedTag = ref('')

const addTag = () => {
  if (newTag.value !== '' && tagsValues.value.indexOf(newTag.value) === -1) {
    values.value.tags[newTag.value] = 0
    newTag.value = ''
  }
  if (newTagRef.value) {
    newTagRef.value.resetValidation()
  }
}
const removeTags = () => {
  meta.removeUnusedTags()
  notify({
    message: `Successfully removed unused tags`,
  })
}
</script>
