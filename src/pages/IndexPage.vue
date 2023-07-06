<template>
  <q-page class="flex flex-center column">
    <q-btn to="/add" color="primary">Upload</q-btn>
    <div class="row">
      <div v-for="(obj, i) in objects" :key="i">
        <q-img
          :src="obj.thumb"
          style="display: block; height: 200px; width: 200px"
        />
        <q-btn @click="remove(obj)">Remove {{ obj.title }}</q-btn>
      </div>
    </div>
    <div class="row">
      <!-- <pre>{{ last }}</pre> -->
      <pre>{{ values }}</pre>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useBucketStore } from "../stores/bucket";
import { useCrudStore } from "../stores/crud";
import { db, storage } from "../boot/fire";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import {
  ref as storageRef,
  deleteObject,
  getDownloadURL,
} from "firebase/storage";
import { removeByProperty, thumbName } from "../helpers";

const bucketStore = useBucketStore();
const crudStore = useCrudStore();
const bucket = computed(() => bucketStore.bucket);
const objects = computed(() => crudStore.objects);
// const values = computed(() => crudStore.values);
const last = computed(() => crudStore.last);
const { values } = storeToRefs(crudStore);
// const { last } = storeToRefs(crudStore);

onMounted(() => {
  crudStore.fetch();
  // crudStore.getLast();
  // crudStore.photoCounters();
});

watch(
  values,
  (newVal) => {
    console.log(newVal);
  },
  { deep: true }
);

const remove = async (obj) => {
  const docRef = doc(db, "Photo", obj.filename);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();
  const stoRef = storageRef(storage, obj.filename);
  const thumbRef = storageRef(storage, thumbName(obj.filename));
  await deleteDoc(docRef);
  await deleteObject(stoRef);
  await deleteObject(thumbRef);

  removeByProperty(objects.value, "filename", obj.filename);
  bucketStore.diff(-data.size);
  bucketStore.read();
  crudStore.decreaseCounters(data);
};
</script>
