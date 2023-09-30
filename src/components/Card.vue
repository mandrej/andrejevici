<template>
  <q-card v-bind="cardAttributes(rec.filename)" flat>
    <q-img
      class="cursor-pointer"
      :ratio="5 / 4"
      :src="rec.thumb ? rec.thumb : rec.url"
      v-ripple.early="{ color: 'purple' }"
      no-spinner
      @click="emit('carouselShow', rec.filename)"
    >
      <template #error>
        <img :src="fileBroken" />
      </template>
      <div v-if="rec.thumb" class="absolute-bottom text-subtitle2">
        {{ rec.headline }}
      </div>
      <q-badge v-else floating class="text-black" color="warning">
        {{ formatBytes(rec.size) }}
      </q-badge>
    </q-img>
    <q-card-section v-if="rec.thumb" class="row justify-between q-py-none">
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
          class="text-secondary"
          style="text-decoration: none"
          >{{ formatDatum(rec.date, "DD.MM.YYYY") }}</router-link
        >
        {{ rec.date.substring(11) }}
      </div>
      <q-btn
        v-if="rec.loc"
        flat
        round
        color="grey"
        icon="my_location"
        target="blank"
        :href="
          'https://www.google.com/maps/search/?api=1&query=' + [...rec.loc]
        "
      />
    </q-card-section>
    <q-card-actions
      v-if="canManage"
      class="justify-between"
      :class="{ 'q-pt-none': Boolean(rec.thumb) }"
    >
      <q-btn
        flat
        round
        color="grey"
        icon="delete"
        @click="
          rec.thumb ? emit('confirmDelete', rec) : emit('deleteRecord', rec)
        "
      />
      <q-btn
        flat
        round
        color="grey"
        :icon="rec.thumb ? 'edit' : 'publish'"
        @click="emit('editRecord', rec)"
      />
      <q-btn
        v-if="rec.thumb"
        flat
        round
        color="grey"
        icon="share"
        @click="onShare"
      />
      <!-- <q-btn
        v-if="rec.thumb"
        flat
        round
        color="grey"
        icon="download"
        href=""
        :download="rec.filename"
        @click="onDownload"
      /> -->
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { copyToClipboard, throttle } from "quasar";
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

const onDownload = throttle((evt) => {
  evt.preventDefault();
  const a = evt.target.closest("a.q-btn");
  fetch(props.rec.url)
    .then((resp) => resp.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.click();
      window.URL.revokeObjectURL(url);
    });
}, 200);

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
