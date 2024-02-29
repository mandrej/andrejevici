<template>
  <q-page class="q-pt-md">
    <q-list separator>
      <q-item>
        <q-item-section>
          <q-item-label>
            <q-input v-model="message" label="Send message to subscribers" />
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            :disabled="!(auth.user.allow_push && auth.token)"
            color="positive"
            label="Send"
            @click="send"
          />
        </q-item-section>
      </q-item>
    </q-list>

    <q-list class="bg-light-green-1">
      <q-item>
        <q-item-section>
          <q-item-label>
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
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn label="Add" @click="addTag" />
        </q-item-section>
      </q-item>
      <q-item class="q-pt-none">
        <q-item-section top
          ><Auto-Complete
            v-model="existingTag"
            :options="meta.tagsValues"
            label="Rename tag"
            behavior="menu"
        /></q-item-section>
        <q-item-section top>
          <q-item-label>
            <q-input
              v-model="renamedTag"
              label="to tag"
              :rules="[
                (val) =>
                  meta.tagsValues.indexOf(val) === -1 || 'Tag already in use',
              ]"
            />
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn label="Rename" @click="renameTag" />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>Remove unused tags</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn label="Remove" @click="removeTags" />
        </q-item-section>
      </q-item>
    </q-list>

    <!-- <q-item-label header>Various helper counters</q-item-label> -->
    <q-list class="bg-deep-orange-1" separator>
      <q-item>
        <q-item-section>
          <q-item-label
            >Recreate existing field values for
            {{ Object.keys(values).join(", ") }}</q-item-label
          >
        </q-item-section>
        <q-item-section side>
          <q-btn color="primary" label="rebuild" @click="rebuild" />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>Bucket count and size</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn color="primary" label="Recalc" @click="bucket" />
        </q-item-section>
      </q-item>
      <!-- <q-item-label header>Fix on </q-item-label> -->
      <q-item>
        <q-item-section>
          <q-item-label
            >{{ formatDatum("2023-08-25", "DD.MM.YYYY") }} Use ASCII for search
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn :disabled="true" color="primary" label="Fix" @click="fix" />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label
            >Resolve Cloud storage and datastore mismatch</q-item-label
          >
        </q-item-section>
        <q-item-section side>
          <q-btn color="primary" label="Resolve" @click="mismatch" />
        </q-item-section>
      </q-item>
    </q-list>
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

const message = ref("NEW IMAGES from " + emailNick(auth.user.email));
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
// const migrate = () => {
//   app.migration();
// };
</script>

<style scoped>
.q-btn {
  width: 100px;
}
</style>
