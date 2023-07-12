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
            :disabled="!auth.fcm_token"
            color="positive"
            label="Send"
            @click="send"
          />
        </q-item-section>
      </q-item>
    </q-list>
    <q-item-label header>Recount existing field values</q-item-label>
    <q-list separator>
      <q-item v-for="field in Object.keys(values)" :key="field">
        <q-item-section>
          <q-item-label>for {{ field }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            :disabled="!auth.fcm_token"
            color="primary"
            label="Rebuild"
            @click="rebuild(field)"
          />
        </q-item-section>
      </q-item>
      <q-item-label header
        >Fix on {{ formatDatum("2023-04-27", "DD.MM.YYYY") }}</q-item-label
      >
      <q-item>
        <q-item-section>
          <q-item-label>Add dimension to all images</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn :disabled="true" color="primary" label="Fix" @click="fix" />
        </q-item-section>
      </q-item>
      <q-item-label header>Cloud storage related</q-item-label>
      <q-item>
        <q-item-section>
          <q-item-label>Bucket count and size</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            :disabled="!auth.fcm_token"
            color="warning"
            label="Recalc"
            @click="bucket"
          />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label
            >Synchronize datastore records and Cloud bucket</q-item-label
          >
        </q-item-section>
        <q-item-section side>
          <q-btn
            :disabled="!auth.fcm_token"
            color="negative"
            label="Repair"
            @click="repair"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script setup>
import { computed, ref } from "vue";
import { useAppStore } from "../stores/app";
import { useAuthStore } from "../stores/auth";
import api from "../helpers/api";
import { formatDatum } from "../helpers";

const app = useAppStore();
const auth = useAuthStore();
const message = ref("NEW IMAGES");

const callApi = (url) => {
  api.post(url, { token: auth.fcm_token }, { timeout: 0 }).then((x) => x.data);
};
const values = computed(() => app.values);
const rebuild = (name) => {
  callApi("rebuild/" + name);
};
const repair = () => {
  callApi("repair");
};
const fix = () => {
  callApi("fix");
};
const bucket = () => {
  app.bucketInfo({ verb: "set" });
};
const send = () => {
  auth.sendNotifications(message.value);
};
</script>

<style scoped>
.q-btn {
  width: 100px;
}
</style>
