<template>
  <q-dialog v-model="popupStore.showEdit">
    <q-card>
      <div>
        <q-btn
          flat
          round
          dense
          icon="close"
          @click="popupStore.showEdit = false"
        />
      </div>
      <q-card-section>
        <q-input v-model="tmp.title" label="Title"></q-input>
        <pre>{{ tmp }}</pre>
        <q-btn @click="publish(tmp)">Publish</q-btn>
      </q-card-section>
    </q-card>
  </q-dialog>
  <!-- <q-page class="flex flex-center column"> </q-page> -->
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import { db } from "../boot/fire";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import readExif from "../helpers/exif";
import { usePopupStore } from "../stores/popup";
import { useCrudStore } from "../stores/crud";

const props = defineProps({
  rec: Object,
});

const crudStore = useCrudStore();
const popupStore = usePopupStore();
// const uploaded = computed(() => crudStore.uploaded);
const tmp = reactive({ ...props.rec });

const publish = async (tmp) => {
  const exif = await readExif(tmp.url);
  await setDoc(doc(db, "Photo", tmp.name), {
    title: "notatle",
    ...tmp,
    ...exif,
  });
  if (exif.model && exif.date) {
    const id = "Photo||model||" + exif.model;
    const docRef = doc(db, "Counter", id);
    const oldDoc = await getDoc(docRef);
    if (oldDoc.exists()) {
      const old = oldDoc.data();
      updateDoc(docRef, {
        count: old.count + 1,
        url: exif.date > old.date ? tmp.url : old.url,
        date: exif.date > old.date ? exif.date : old.date,
      });
    } else {
      await setDoc(
        docRef,
        {
          count: 1,
          field: "model",
          value: exif.model,
          kind: "Photo",
          url: tmp.url,
          date: exif.date,
        },
        { merge: true }
      );
    }
    crudStore.uploaded.splice(
      crudStore.uploaded.findIndex((it) => it.name === tmp.name),
      1
    );
    popupStore.showEdit = false;
  }
};
</script>
