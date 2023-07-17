<template>
  <q-dialog v-model="crudStore.showEdit">
    <q-card>
      <div>
        <q-btn
          flat
          round
          dense
          icon="close"
          @click="crudStore.showEdit = false"
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
import { useCrudStore } from "../stores/crud";
import { useBucketStore } from "../stores/bucket";
import { useValuesStore } from "../stores/values";
import { CONFIG, removeByProperty } from "../helpers";

const props = defineProps({
  rec: Object,
});

const crudStore = useCrudStore();
const bucketStore = useBucketStore();
const valuesStore = useValuesStore();
const tmp = reactive({ ...props.rec });
const tags = ref(["still life", "b&w", "street", "portrait", "sky"]);

const publish = async (tmp) => {
  const exif = await readExif(tmp.url);
  const data = {
    title: CONFIG.noTitle,
    tags: [],
    ...tmp,
    ...exif,
  };
  setDoc(doc(db, "Photo", data.filename), data).then((obj) => {
    valuesStore.increaseCounters(data);
    bucketStore.diff(data.size);
    removeByProperty(crudStore.uploaded, "filename", data.filename);
    crudStore.showEdit = false;
  });
};
</script>
