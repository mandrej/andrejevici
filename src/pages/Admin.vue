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
      <!-- <q-item-label header
        >Fix on {{ formatDatum("2023-04-27", "DD.MM.YYYY") }}</q-item-label
      >
      <q-item>
        <q-item-section>
          <q-item-label>Add dimension to all images</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn :disabled="true" color="primary" label="Fix" @click="fix" />
        </q-item-section>
      </q-item> -->
      <!-- <q-item-label header>Cloud storage related</q-item-label> -->
      <q-item>
        <q-item-section>
          <q-item-label
            >Repair Cloud storage and datastore mismatch</q-item-label
          >
        </q-item-section>
        <q-item-section side>
          <q-btn
            :disabled="!auth.fcm_token"
            color="primary"
            label="Repair"
            @click="repair"
          />
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label>Migration meta data from andsnews</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            :disabled="!auth.fcm_token"
            color="primary"
            label="Migrate"
            @click="migrate"
          />
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
const valuesStore = useValuesStore();
const auth = useUserStore();
const messaging = getMessaging();

const message = ref("NEW IMAGES");
const resolve = ref(0);
const values = computed(() => valuesStore.values);

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
  valuesStore.photos2counters2store();
};
const bucket = () => {
  app.scretch();
};
const repair = async () => {
  notify({ message: `Please wait...`, group: "repair" });
  resolve.value = await app.mismatch();
  if (resolve.value === 0) {
    notify({ message: `All good. Nothing to reslove`, group: "repair" });
  } else {
    notify({
      type: "warning",
      message: `Resolve ${resolve.value} mismathed files either by<br>publish or delete. Files exist
            on Add page`,
      html: true,
      timeout: 0,
      group: "repair",
    });
  }
};
const fix = () => {};
const send = () => {
  auth.sendNotifications(message.value);
};
const migrate = () => {
  app.migration();
};
</script>

<style scoped>
.q-btn {
  width: 100px;
}
</style>
