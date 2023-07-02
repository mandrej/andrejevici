<template>
  <q-page class="flex flex-center column">
    <router-link to="/add">Upload</router-link>
    <div class="row">
      <div v-for="(obj, i) in objects" :key="i">
        <q-img
          :src="obj.url"
          style="display: block; height: 150px; width: 150px"
        />
        <q-btn @click="remove(obj)">Remove {{ obj.title }}</q-btn>
        <!-- <p>
          {{
            date.formatDate(obj.date.seconds * 1000, "YYYY-MM-DDTHH:mm:ss.SSSZ")
          }}
        </p> -->
      </div>
    </div>
    <div class="row">
      <pre>{{ bucket }}</pre>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, computed } from "vue";
import { useBucketStore } from "../stores/bucket";
import { useCrudStore } from "../stores/crud";
import { db, storage } from "../boot/fire";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { removeByProperty } from "../helpers";
// import { date } from "quasar";

const bucketStore = useBucketStore();
const crudStore = useCrudStore();
const bucket = computed(() => bucketStore.bucket);
const objects = computed(() => crudStore.objects);

onMounted(() => {
  crudStore.fetch();
  crudStore.scretchCounters();
});

const remove = async (obj) => {
  const docRef = doc(db, "Photo", obj.filename);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();
  const stoRef = storageRef(storage, obj.filename);
  await deleteDoc(docRef);
  await deleteObject(stoRef);

  removeByProperty(objects.value, "filename", obj.filename);
  bucketStore.diff(-data.size);
  bucketStore.read();
  await crudStore.decreaseCounters(data);
};
</script>
