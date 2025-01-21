<template>
  <q-list>
    <q-item class="text-h6">Model</q-item>

    <q-item class="q-pt-none">
      <q-item-section top>
        <Auto-Complete
          v-model="existingModel"
          :options="meta.modelValues"
          behavior="menu"
          label="Rename model"
        />
      </q-item-section>
      <q-item-section top>
        <q-input
          v-model="changedModel"
          label="to model"
          :rules="[(val) => val.indexOf('/') === -1 || 'Cannot use / here']"
        />
      </q-item-section>
      <q-item-section side>
        <q-btn
          label="Rename"
          @click="rename('model', existingModel, changedModel)"
          color="primary"
        />
      </q-item-section>
    </q-item>
  </q-list>
  <div class="q-pa-md text-subtitle1">
    <router-link
      v-for="value in meta.modelValues"
      :key="value"
      :title="`${value}`"
      :to="{ path: '/list', query: { model: value } }"
      class="q-pr-sm link"
      >{{ value }},
    </router-link>
  </div>

  <q-list>
    <q-item class="text-h6">Lens</q-item>
    <q-item class="q-pt-none">
      <q-item-section top>
        <Auto-Complete
          v-model="existingLens"
          :options="meta.lensValues"
          behavior="menu"
          label="Rename lens"
        />
      </q-item-section>
      <q-item-section top>
        <q-input
          v-model="changedLens"
          label="to lens"
          :rules="[(val) => val.indexOf('/') === -1 || 'Cannot use / here']"
        />
      </q-item-section>
      <q-item-section side>
        <q-btn
          label="Rename"
          @click="rename('lens', existingLens, changedLens)"
          color="primary"
        />
      </q-item-section>
    </q-item>
  </q-list>
  <div class="q-pa-md text-subtitle1">
    <router-link
      v-for="value in meta.lensValues"
      :key="value"
      :title="`${value}`"
      :to="{ path: '/list', query: { model: value } }"
      class="q-pr-sm link"
      >{{ value }},</router-link
    >
  </div>
</template>

<script setup>
import { ref } from "vue";
import { rename } from "../helpers/remedy";
import { useValuesStore } from "../stores/values";
import AutoComplete from "../components/Auto-Complete.vue";

const meta = useValuesStore();

const existingModel = ref(""),
  changedModel = ref(""),
  existingLens = ref(""),
  changedLens = ref("");
</script>
