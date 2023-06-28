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
        <!-- <pre>{{ tmp }}</pre> -->
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
  const data = {
    title: "notatle",
    ...tmp,
    ...exif,
  };
  await setDoc(doc(db, "Photo", tmp.name), data);
  if (data.model && data.date) {
    const id = "Photo||model||" + data.model;
    const docRef = doc(db, "Counter", id);
    const oldDoc = await getDoc(docRef);
    if (oldDoc.exists()) {
      const old = oldDoc.data();
      await updateDoc(docRef, {
        count: old.count + 1,
        url: data.date > old.date ? tmp.url : old.url,
        date: data.date > old.date ? data.date : old.date,
      });
    } else {
      await setDoc(
        docRef,
        {
          count: 1,
          field: "model",
          value: data.model,
          kind: "Photo",
          url: tmp.url,
          date: data.date,
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
