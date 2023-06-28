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
      <pre>{{ bucketState }}</pre>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, computed } from "vue";
import { useBucketStore } from "../stores/bucket";
import { useCrudStore } from "../stores/crud";
import { db, storage } from "../boot/fire";
import {
  doc,
  collection,
  query,
  where,
  limit,
  orderBy,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
// import { date } from "quasar";

const bucketStore = useBucketStore();
const crudStore = useCrudStore();
const bucketState = computed(() => bucketStore.bucket);
const objects = computed(() => crudStore.objects);

const photosRef = collection(db, "Photo");

const removeByName = (arr, name) => {
  const idx = arr.findIndex((it) => it.name === name);
  if (idx !== -1) arr.splice(idx, 1);
};

onMounted(() => {
  crudStore.fetch();
  bucketStore.scretch();
});

const remove = async (obj) => {
  const docRef = doc(db, "Photo", obj.name);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();
  const stoRef = storageRef(storage, obj.name);
  await deleteDoc(docRef);
  await deleteObject(stoRef);

  removeByName(objects.value, obj.name);
  bucketStore.diff(-data.size);
  bucketStore.read();

  const counterRef = doc(db, "Counter", "Photo||model||" + data.model);
  const counterSnap = await getDoc(counterRef);
  const counter = counterSnap.data();

  const q = query(
    photosRef,
    where("model", "==", data.model),
    orderBy("date", "desc"),
    limit(1)
  );
  const res = [];
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
    res.push(doc.data());
  });
  if (res.length === 1) {
    await updateDoc(counterRef, {
      count: counter.count - 1,
      date: res[0].date,
      url: res[0].url,
    });
  } else {
    await deleteDoc(counterRef);
  }
};
</script>
