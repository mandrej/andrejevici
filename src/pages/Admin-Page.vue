<template>
  <q-page class="q-pt-md">
    <q-list separator>
      <q-item v-if="auth.user.allow_push">
        <q-item-section>
          <q-item-label>
            <q-input v-model="message" label="Send message to subscribers" />
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn color="positive" label="Send" @click="send" />
        </q-item-section>
      </q-item>
    </q-list>
    <q-item-label header>Various helper counters</q-item-label>
    <q-list separator>
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
          <q-btn color="primary" label="Resolve" @click="repair" />
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
import { CONFIG, formatDatum, emailNick } from "../helpers";

const app = useAppStore();
const meta = useValuesStore();
const auth = useUserStore();

const message = ref("NEW IMAGES from " + emailNick(auth.user.email));
const values = computed(() => meta.values);

const rebuild = () => {
  meta.countersBuild();
};
const bucket = () => {
  app.bucketBuild();
};
const repair = async () => {
  await app.mismatch();
};
const fix = () => {
  app.fix();
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
