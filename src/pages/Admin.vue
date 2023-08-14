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
            >{{ formatDatum("2023-08-09", "DD.MM.YYYY") }} Remove some records
            after migration</q-item-label
          >
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
import { computed, ref, onMounted } from "vue";
import { useAppStore } from "../stores/app";
import { useValuesStore } from "../stores/values";
import { useUserStore } from "../stores/user";
import { formatDatum } from "../helpers";
import { getMessaging, getToken } from "firebase/messaging";
import { CONFIG } from "../helpers";
import notify from "../helpers/notify";

const app = useAppStore();
const meta = useValuesStore();
const auth = useUserStore();
const messaging = getMessaging();

const message = ref("NEW IMAGES");
const values = computed(() => meta.values);

onMounted(() => {
  getPermission();
});

const getPermission = () => {
  try {
    Notification.requestPermission().then((permission) =>
      fetchToken(permission)
    );
  } catch (error) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API
    Notification.requestPermission(function (permission) {
      fetchToken(permission);
    });
  }
};
const fetchToken = (permission) => {
  if (permission === "granted") {
    return getToken(messaging, { vapidKey: CONFIG.firebase.vapidKey })
      .then((token) => {
        if (token) {
          if (auth.fcm_token === null || token !== auth.fcm_token) {
            auth.fcm_token = token;
            // if (this.user && this.user.uid) {
            //   this.addRegistration();
            // }
          }
        }
      })
      .catch(function (err) {
        console.error("Unable to retrieve token ", err);
      });
  }
};

const rebuild = () => {
  meta.photos2counters2store();
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
  auth.sendNotifications(message.value);
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
