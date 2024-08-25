<template>
  <q-page class="q-pt-md">
    <q-tab-panels v-model="app.tab" animated>
      <q-tab-panel name="repair">
        <div class="text-h6">Rebuild / Repair</div>
        <q-list class="bg-grey-2">
          <q-item>
            <q-item-section>
              <q-input v-model="message" label="Send message to subscribers" />
            </q-item-section>
            <q-item-section side>
              <q-btn
                :disabled="!auth.token"
                color="secondary"
                label="Send"
                @click="send"
              />
            </q-item-section>
          </q-item>
        </q-list>
        <q-list class="bg-grey-2" separator>
          <q-item>
            <q-item-section>
              Recreate existing field values for
              {{ Object.keys(values).join(", ") }}
            </q-item-section>
            <q-item-section side>
              <q-btn color="primary" label="rebuild" @click="rebuild" />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section> Bucket count and size </q-item-section>
            <q-item-section side>
              <q-btn color="primary" label="Recalc" @click="bucket" />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              {{ formatDatum("2023-08-25", "DD.MM.YYYY") }} Use ASCII for search
            </q-item-section>
            <q-item-section side>
              <q-btn
                :disabled="true"
                color="primary"
                label="Fix"
                @click="fix"
              />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              Resolve Cloud storage and datastore mismatch
            </q-item-section>
            <q-item-section side>
              <q-btn color="negative" label="Resolve" @click="mismatch" />
            </q-item-section>
          </q-item>
        </q-list>

        <!-- <q-btn color="primary" label="Show" @click="show" />
        <q-btn class="bg-secondary text-dark" label="Show" @click="show" />
        <q-btn color="accent" label="Show" @click="show" />
        <q-btn color="positive" label="Show" @click="show" />
        <q-btn color="negative" label="Show" @click="show" />
        <q-btn color="dark" label="Show" @click="show" /> -->
      </q-tab-panel>

      <q-tab-panel name="tags">
        <div class="text-h6">Tags</div>
        <q-list class="bg-grey-2">
          <q-item>
            <q-item-section>
              <q-input
                ref="newTagRef"
                v-model="newTag"
                label="Add new tag"
                :rules="[
                  (val) =>
                    meta.tagsValues.indexOf(val) === -1 || 'Tag already in use',
                ]"
                clearable
              />
            </q-item-section>
            <q-item-section side>
              <q-btn label="Add" @click="addTag" />
            </q-item-section>
          </q-item>
          <q-item class="q-pt-none">
            <q-item-section top>
              <Auto-Complete
                v-model="existingTag"
                :options="meta.tagsValues"
                behavior="menu"
                label="Rename tag"
              />
            </q-item-section>
            <q-item-section top>
              <q-input v-model="renamedTag" label="to tag" />
            </q-item-section>
            <q-item-section side>
              <q-btn label="Rename" @click="renameTag" />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section> Remove unused tags</q-item-section>
            <q-item-section side>
              <q-btn label="Remove" @click="removeTags" />
            </q-item-section>
          </q-item>
        </q-list>

        <q-scroll-area class="gt-xs" style="height: 50vh">
          <div class="q-pa-md text-subtitle1">
            <router-link
              v-for="(count, value) in meta.tagsWithCount"
              :class="linkAttribute(count, CONFIG.tagsMin)"
              :key="value"
              :title="`${value}: ${count}`"
              :to="{ path: '/list', query: { tags: value } }"
              class="q-pr-sm link"
              >{{ value }}</router-link
            >
          </div>
        </q-scroll-area>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { computed, ref } from "vue";
import { useAppStore } from "../stores/app";
import { useValuesStore } from "../stores/values";
import { useUserStore } from "../stores/user";
import AutoComplete from "../components/Auto-Complete.vue";
import { fix, mismatch } from "../helpers/remedy";
import notify from "../helpers/notify";
import { CONFIG, formatDatum, emailNick } from "../helpers";
import { timeout } from "workbox-core/_private";

const app = useAppStore();
const meta = useValuesStore();
const auth = useUserStore();

const message = ref("TEST");
// const message = ref("NEW IMAGES from " + emailNick(auth.user.email));
const values = computed(() => meta.values);
const newTagRef = ref(null),
  newTag = ref(""),
  existingTag = ref(""),
  renamedTag = ref("");

const rebuild = () => {
  meta.countersBuild();
};
const bucket = () => {
  app.bucketBuild();
};
const addTag = () => {
  if (newTag.value !== "" && meta.tagsValues.indexOf(newTag.value) === -1) {
    values.value.tags[newTag.value] = 0;
    newTag.value = "";
  }
  newTagRef.value.resetValidation();
};
const removeTags = () => {
  meta.removeUnusedTags();
  notify({
    message: `Successfully removed unused tags`,
  });
};
const renameTag = () => {
  if (existingTag.value !== "" && renamedTag.value !== "") {
    if (existingTag.value === "flash") {
      notify({
        type: "warning",
        message: `Cannot change "${existingTag.value}"`,
      });
    } else if (meta.tagsValues.indexOf(renamedTag.value) !== -1) {
      meta.renameTag(existingTag.value, renamedTag.value);
      notify({
        type: "warning",
        message: `"${existingTag.value}" tag renamed with "${renamedTag.value}"`,
      });
    } else {
      meta.renameTag(existingTag.value, renamedTag.value);
      notify({
        message: `Tag ${existingTag.value} successfully renamed to ${renamedTag.value}`,
      });
    }
  }
  existingTag.value = "";
  renamedTag.value = "";
};

const send = () => {
  const url = process.env.DEV
    ? "http://localhost:5001/andrejevici/us-central1/notify"
    : CONFIG.notifyUrl;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };
  fetch(url, {
    method: "POST",
    mode: "cors",
    headers: headers,
    body: JSON.stringify({ text: message.value.trim() }),
  })
    .then((response) => response.text())
    .then((text) => {
      return text;
    });
};

const linkAttribute = (count, limit = 5) => {
  if (count < limit) {
    return "text-grey";
  }
  return "text-black";
};

const show = () => {
  const colors = [
    "info",
    "warning",
    "positive",
    "negative",
    "ongoing",
    "external",
  ];
  for (const color of colors) {
    notify({
      type: color,
      message: `${color}`,
    });
  }
};
</script>

<style scoped>
.q-btn {
  width: 100px;
}
.link {
  display: inline-block;
  text-decoration: none;
}
</style>
