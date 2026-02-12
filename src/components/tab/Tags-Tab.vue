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
      <a
        v-for="(count, value) in tagsWithCount"
        :key="value"
        :title="`${value}: ${count}`"
        @click="app.searchBy({ tags: [value] })"
        href="/list"
        class="q-pr-sm link"
        >{{ value }},</a
      >
    </div>
  </q-scroll-area>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import AutoComplete from 'src/components/Auto-Complete.vue'
import { removeUnusedTags, renameValue } from 'src/helpers/remedy'
import notify from 'src/helpers/notify'
import type { QInput } from 'quasar'
import type { ValuesState } from 'src/helpers/models'

const meta = useValuesStore()
const app = useAppStore()
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
  try {
    removeUnusedTags()
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
const rename = (field: keyof ValuesState['values'], existing: string, changed: string) => {
  if (existing !== '' && changed !== '') {
    if (field === 'tags' && existing === 'flash') {
      notify({
        type: 'warning',
        message: `Cannot change "${existing}"`,
      })
      // } else if (Object.keys(meta.values[field]).indexOf(changed) !== -1) {
      //   notify({
      //     type: 'warning',
      //     message: `"${changed}" already exists"`,
      //   })
    } else {
      renameValue(field, existing, changed)
      notify({
        message: `${existing} successfully renamed to ${changed}`,
      })
    }
  }
}
</script>

<style scoped>
.q-btn--standard {
  width: 100px;
}
</style>
