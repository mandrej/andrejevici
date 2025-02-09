<template>
  <div class="q-pa-md">
    <div class="text-h6">Model</div>
    <ButtonRow>
      <div class="row">
        <Auto-Complete
          label="Rename model"
          v-model="existingModel"
          :options="modelValues"
          class="col q-mr-md"
        />
        <q-input
          v-model="changedModel"
          label="to model"
          :rules="[(val) => val.indexOf('/') === -1 || 'Cannot use / here']"
          class="col"
        />
      </div>
      <template #button>
        <q-btn
          label="Rename"
          @click="rename('model', existingModel, changedModel)"
          color="primary"
        />
      </template>
    </ButtonRow>

    <div class="text-subtitle1">
      <router-link
        v-for="value in modelValues"
        :key="value"
        :title="`${value}`"
        :to="{ path: '/list', query: { model: value } }"
        class="q-pr-sm link"
        >{{ value }},
      </router-link>
    </div>

    <div class="q-mt-md text-h6">Lens</div>
    <ButtonRow>
      <div class="row">
        <Auto-Complete
          label="Rename lens"
          v-model="existingLens"
          :options="lensValues"
          class="col q-mr-md"
        />
        <q-input
          v-model="changedLens"
          label="to lens"
          :rules="[(val) => val.indexOf('/') === -1 || 'Cannot use / here']"
          class="col"
        />
      </div>
      <template #button>
        <q-btn label="Rename" @click="rename('lens', existingLens, changedLens)" color="primary" />
      </template>
    </ButtonRow>

    <div class="text-subtitle1">
      <router-link
        v-for="value in lensValues"
        :key="value"
        :title="`${value}`"
        :to="{ path: '/list', query: { lens: value } }"
        class="q-pr-sm link"
        >{{ value }},</router-link
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { rename } from '../helpers/remedy'
import { storeToRefs } from 'pinia'
import { useValuesStore } from '../stores/values'
import AutoComplete from '../components/Auto-Complete.vue'
import ButtonRow from './Button-Row.vue'

const meta = useValuesStore()
const { modelValues, lensValues } = storeToRefs(meta)

const existingModel = ref(''),
  changedModel = ref(''),
  existingLens = ref(''),
  changedLens = ref('')
</script>
