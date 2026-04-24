<template>
  <PageTitle title="Camera" icon="sym_r_camera" />

  <q-item>
    <q-item-section>
      <div class="row">
        <AutoComplete
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
        <AutoComplete
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
import { renameValue } from '../../helpers/remedy'
import { storeToRefs } from 'pinia'
import { useValuesStore } from '../../stores/values'
import PageTitle from '../PageTitle.vue'
import AutoComplete from '../AutoComplete.vue'
import type { ValuesState } from '../../helpers/models'
import notify from '../../helpers/notify'

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
    } else {
      await renameValue(field, existing, changed)
      notify({
        message: `${existing} successfully renamed to ${changed}`,
        type: 'positive',
        icon: 'sym_r_check',
      })
    }
  }
}
</script>
