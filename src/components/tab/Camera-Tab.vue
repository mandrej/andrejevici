<template>
  <div class="q-pa-md text-h6">Model</div>

  <q-item>
    <q-item-section>
      <div class="row">
        <Auto-Complete
          label="Rename model"
          v-model="existingModel"
          :options="modelValues"
          class="col"
        />
        <div class="q-mx-md"></div>
        <q-input
          v-model="changedModel"
          label="to model"
          :rules="[(val) => val.indexOf('/') === -1 || 'Cannot use / here']"
          class="col"
        />
      </div>
    </q-item-section>
    <q-item-section side
      ><q-btn label="Rename" @click="rename('model', existingModel, changedModel)" color="primary"
    /></q-item-section>
  </q-item>

  <div class="q-pa-md text-h6">Lens</div>
  <q-item>
    <q-item-section>
      <div class="row">
        <Auto-Complete
          label="Rename lens"
          v-model="existingLens"
          :options="lensValues"
          class="col"
        />
        <div class="q-mx-md"></div>
        <q-input
          v-model="changedLens"
          label="to lens"
          :rules="[(val) => val.indexOf('/') === -1 || 'Cannot use / here']"
          class="col"
        />
      </div>
    </q-item-section>
    <q-item-section side>
      <q-btn label="Rename" @click="rename('lens', existingLens, changedLens)" color="primary" />
    </q-item-section>
  </q-item>

  <div class="q-pa-md text-subtitle1">
    <router-link
      v-for="value in modelValues"
      :key="value"
      :title="`${value}`"
      :to="{ path: '/list', query: { model: value } }"
      class="q-pr-sm link"
      >{{ value }},
    </router-link>
    <br />
    <router-link
      v-for="value in lensValues"
      :key="value"
      :title="`${value}`"
      :to="{ path: '/list', query: { lens: value } }"
      class="q-pr-sm link"
      >{{ value }},</router-link
    >
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { renameValue } from 'src/helpers/remedy'
import { storeToRefs } from 'pinia'
import { useValuesStore } from 'src/stores/values'
import AutoComplete from 'src/components/Auto-Complete.vue'
import type { ValuesState } from 'src/helpers/models'
import notify from 'src/helpers/notify'

const meta = useValuesStore()
const { modelValues, lensValues } = storeToRefs(meta)

const existingModel = ref(''),
  changedModel = ref(''),
  existingLens = ref(''),
  changedLens = ref('')

const rename = async (field: keyof ValuesState['values'], existing: string, changed: string) => {
  if (existing !== '' && changed !== '') {
    if (field === 'model' && existing === 'UNKNOWN') {
      notify({
        type: 'warning',
        message: `Cannot change "${existing}"`,
      })
    } else if (Object.keys(meta.values[field]).indexOf(changed) !== -1) {
      notify({
        type: 'warning',
        message: `"${changed}" already exists"`,
      })
    } else {
      await renameValue(field, existing, changed)
      notify({
        message: `${existing} successfully renamed to ${changed}`,
      })
    }
  }
}
</script>
