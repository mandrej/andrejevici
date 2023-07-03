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
        <q-input v-model="tmp.title" label="Title" autofocus></q-input>
        <q-select
          v-model="tmp.tags"
          :options="tags"
          label="Tags"
          multiple
        ></q-select>
        <pre>{{ tmp }}</pre>
        <q-btn @click="publish(tmp)">Publish</q-btn>
      </q-card-section>
    </q-card>
  </q-dialog>
  <!-- <q-page class="flex flex-center column"> </q-page> -->
</template>

<script setup>
import { ref, reactive } from "vue";
import { db } from "../boot/fire";
import { doc, setDoc } from "firebase/firestore";
import readExif from "../helpers/exif";
import { usePopupStore } from "../stores/popup";
import { useCrudStore } from "../stores/crud";
import { useBucketStore } from "../stores/bucket";
import { removeByProperty } from "../helpers";

const props = defineProps({
  rec: Object,
});

const crudStore = useCrudStore();
const popupStore = usePopupStore();
const bucketStore = useBucketStore();
const tmp = reactive({ ...props.rec });
const tags = ref(["still life", "b&w", "street", "portrait"]);

const publish = async (tmp) => {
  const exif = await readExif(tmp.url);
  const data = {
    title: "notitle",
    tags: [],
    ...tmp,
    ...exif,
  };
  await setDoc(doc(db, "Photo", data.filename), data);
  crudStore.increaseCounters(data);
  bucketStore.diff(data.size);

  removeByProperty(crudStore.uploaded, "filename", data.filename);
  popupStore.showEdit = false;
};
</script>
