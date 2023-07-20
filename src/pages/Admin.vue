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
    <q-item-label header>Various helper counters</q-item-label>
    <q-list separator>
      <q-item>
        <q-item-section>
          <q-item-label
            >Recreate existing field values for
            {{ Object.keys(values).join(" ") }}</q-item-label
          >
        </q-item-section>
        <q-item-section side>
          <q-btn
            :disabled="!auth.fcm_token"
            color="primary"
            label="rebuild"
            @click="rebuild"
          />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>Bucket count and size</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            :disabled="!auth.fcm_token"
            color="primary"
            label="Recalc"
            @click="bucket"
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
import { useValuesStore } from "../stores/values";
import { useBucketStore } from "../stores/bucket";
import { useAuthStore } from "../stores/auth";
import { formatDatum } from "../helpers";

const valuesStore = useValuesStore();
const bucketStore = useBucketStore();
const auth = useAuthStore();
const message = ref("NEW IMAGES");

const values = computed(() => valuesStore.values);

const rebuild = () => {
  valuesStore.photos2counters2store();
};
const bucket = () => {
  bucketStore.scretch();
};
// const repair = () => {
//   callApi("repair");
// };
// const fix = () => {
//   callApi("fix");
// };
const send = () => {
  auth.sendNotifications(message.value);
};
</script>

<style scoped>
.q-btn {
  width: 100px;
}
</style>
