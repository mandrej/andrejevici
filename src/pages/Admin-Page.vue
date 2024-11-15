<template>
  <q-page class="q-pt-md">
    <q-tab-panels v-model="app.adminTab">
      <q-tab-panel name="repair" class="q-pa-none">
        <q-list>
          <q-item class="text-h6">Rebuild / Repair</q-item>
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
        <q-list separator>
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
              {{ formatDatum("2024-10-27", "DD.MM.YYYY") }} Fix text array
            </q-item-section>
            <q-item-section side>
              <q-btn
                :disabled="!auth.token"
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

      <q-tab-panel name="tags" class="q-pa-none">
        <q-list>
          <q-item class="text-h6">Tags</q-item>
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
              <q-btn label="Add" @click="addTag" color="primary" />
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
              <q-input v-model="changedTag" label="to tag" />
            </q-item-section>
            <q-item-section side>
              <q-btn
                label="Rename"
                @click="rename('tags', existingTag, changedTag)"
                color="primary"
              />
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section> Remove unused tags</q-item-section>
            <q-item-section side>
              <q-btn label="Remove" @click="removeTags" color="primary" />
            </q-item-section>
          </q-item>
        </q-list>

        <q-scroll-area class="gt-xs" style="height: 50vh">
          <div class="q-pa-md text-subtitle1">
            <router-link
              v-for="(count, value) in meta.tagsWithCount"
              :key="value"
              :title="`${value}: ${count}`"
              :to="{ path: '/list', query: { tags: value } }"
              class="q-pr-sm link"
              >{{ value }},</router-link
            >
          </div>
        </q-scroll-area>
      </q-tab-panel>

      <q-tab-panel name="camera" class="q-pa-none">
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
              <q-input v-model="changedModel" label="to model" />
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
              <q-input v-model="changedLens" label="to lens" />
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

const app = useAppStore();
const meta = useValuesStore();
const auth = useUserStore();

const message = ref("TEST");
// const message = ref("NEW IMAGES from " + emailNick(auth.user.email));
const values = computed(() => meta.values);
const newTagRef = ref(null),
  newTag = ref(""),
  existingTag = ref(""),
  changedTag = ref(""),
  existingModel = ref(""),
  changedModel = ref(""),
  existingLens = ref(""),
  changedLens = ref("");

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
const rename = async (field, existing, changed) => {
  if (existing !== "" && changed !== "") {
    if (
      (field === "tags" && existing === "flash") ||
      (field === "model" && existing === "UNKNOWN")
    ) {
      notify({
        type: "warning",
        message: `Cannot change "${existing}"`,
      });
    } else if (Object.keys(meta.values[field]).indexOf(changed) !== -1) {
      notify({
        type: "warning",
        message: `"${changed}" already exists"`,
      });
    } else {
      await meta.renameValue(field, existing, changed);
      notify({
        message: `${existing} successfully renamed to ${changed}`,
      });
    }
  }
};

const send = () => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };
  fetch(CONFIG.notifyUrl, {
    method: "POST",
    mode: "cors",
    headers: headers,
    body: JSON.stringify({ text: message.value.trim() }),
  })
    .then((response) => {
      if (!response.ok) {
        throw response;
      }
      return response.text();
    })
    .then((text) => {
      notify({ message: `Message ${text} sent` });
      return text;
    })
    .catch((error) => {
      notify({ type: "negative", message: `${error}` });
    });
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
</style>
