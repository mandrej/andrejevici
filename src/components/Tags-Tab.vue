<template>
  <div class="q-pa-md text-h6">Tags</div>

  <q-item>
    <q-item-section>
      <q-input
        ref="newTagRef"
        v-model="newTag"
        label="Add new tag"
        :rules="[(val: string) => tagsValues.indexOf(val) === -1 || 'Tag already in use']"
        clearable
      />
    </q-item-section>
    <q-item-section side>
      <q-btn label="Add" @click="addTag" color="primary" />
    </q-item-section>
  </q-item>
  <q-item>
    <q-item-section>
      <div class="row">
        <Auto-Complete label="Rename tag" v-model="existingTag" :options="tagsValues" class="col" />
        <div class="q-mx-md"></div>
        <q-input
          v-model="changedTag"
          label="to tag"
          clearable
          :rules="[(val: string) => val.indexOf('/') === -1 || 'Cannot use / here']"
          class="col"
        />
      </div>
    </q-item-section>
    <q-item-section side>
      <q-btn label="Rename" @click="rename('tags', existingTag, changedTag)" color="primary" />
    </q-item-section>
  </q-item>
  <q-item>
    <q-item-section>Remove unused tags</q-item-section>
    <q-item-section side>
      <q-btn label="Remove" @click="removeTags" color="primary" />
    </q-item-section>
  </q-item>

  <q-scroll-area class="gt-xs q-pa-md" style="height: 50vh">
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
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useValuesStore } from '../stores/values'
import AutoComplete from '../components/Auto-Complete.vue'
import { rename } from '../helpers/remedy'
import notify from '../helpers/notify'
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
const removeTags = async () => {
  try {
    await meta.removeUnusedTags()
    notify({
      message: `Successfully removed unused tags`,
    })
  } catch (error) {
    notify({
      message: `Failed to remove unused tags: ${error instanceof Error ? error.message : String(error)}`,
      type: 'negative',
    })
  }
}
</script>

<style scoped>
.q-btn--standard {
  width: 100px;
}
</style>
