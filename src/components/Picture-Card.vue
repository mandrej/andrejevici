<template>
  <q-card v-if="rec.thumb" v-bind="cardAttributes(rec.filename)" flat>
    <q-img
      class="cursor-pointer"
      loading="lazy"
      :ratio="5 / 4"
      :src="rec.thumb"
      v-ripple.early="{ color: 'purple' }"
      no-spinner
      @click="emit('carouselShow', rec.filename)"
    >
      <template #error>
        <img :src="fileBroken" />
      </template>
      <div class="absolute-bottom text-subtitle2">
        {{ rec.headline }}
      </div>
    </q-img>
    <q-card-section class="row justify-between q-py-none q-pr-sm">
      <div style="line-height: 42px">
        {{ rec.nick }},
        <router-link
          :to="{
            path: '/list',
            query: {
              year: rec.year,
              month: rec.month,
              day: rec.day,
            },
          }"
          class="text-dark"
          style="text-decoration: underline"
          >{{ formatDatum(rec.date, "DD.MM.YYYY") }}</router-link
        >
        {{ rec.date.substring(11) }}
      </div>
      <q-btn
        v-if="rec.loc"
        flat
        round
        icon="my_location"
        target="blank"
        :href="
          'https://www.google.com/maps/search/?api=1&query=' + [...rec.loc]
        "
      />
    </q-card-section>
    <q-card-actions class="justify-between q-pt-none">
      <q-btn
        flat
        round
        icon="delete"
        :disable="!canManage"
        @click="emit('confirmDelete', rec)"
      />
      <q-btn
        flat
        round
        icon="edit"
        :disable="!canManage"
        @click="emit('editRecord', rec)"
      />
      <q-btn flat round icon="share" @click="onShare" />
    </q-card-actions>
  </q-card>

  <q-card v-else v-bind="cardAttributes(rec.filename)" flat>
    <q-img
      class="cursor-pointer"
      loading="lazy"
      :ratio="5 / 4"
      :src="rec.url"
      v-ripple.early="{ color: 'purple' }"
      no-spinner
      @click="emit('carouselShow', rec.filename)"
    >
      <template #error>
        <img :src="fileBroken" />
      </template>
      <q-badge floating class="text-black" color="warning">
        {{ formatBytes(rec.size) }}
      </q-badge>
    </q-img>
    <q-card-actions v-if="canManage" class="justify-between">
      <q-btn flat round icon="delete" @click="emit('deleteRecord', rec)" />
      <q-btn flat round icon="publish" @click="emit('editRecord', rec)" />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { copyToClipboard } from "quasar";
import {
  fileBroken,
  formatDatum,
  formatBytes,
  U,
  reFilename,
} from "../helpers";
import notify from "../helpers/notify";

const emit = defineEmits([
  "carouselShow",
  "confirmDelete",
  "editRecord",
  "deleteRecord",
]);
const props = defineProps({
  rec: Object,
  canManage: Boolean,
});

const cardAttributes = (filename) => {
  const [, name, ext] = filename.match(reFilename);
  return {
    id: U + name,
    class: ext.substring(1) + " bg-grey-2",
  };
};
const onShare = () => {
  const url = window.location.href + "#" + U + props.rec.filename;
  copyToClipboard(url)
    .then(() => {
      notify({ message: "URL copied to clipboard" });
    })
    .catch(() => {
      notify({ type: "warning", message: "Unable to copy URL to clipboard" });
    });
};
</script>

<style lang="scss" scoped>
.q-btn {
  color: $grey-7;
}
.q-btn.disabled {
  opacity: 0.2 !important;
}
</style>
