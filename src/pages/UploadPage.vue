<template>
  <Edit v-if="popupStore.showEdit" :rec="crudStore.current" />

  <q-page class="flex flex-center column">
    <div class="row">
      <div v-for="(obj, i) in uploaded" :key="i">
        <q-img
          :src="obj.url"
          style="display: block; height: 150px; width: 150px"
        />
        <q-btn @click="edit(obj)">Edit</q-btn>
      </div>
    </div>
    <q-linear-progress
      v-for="(progress, index) in progressInfos"
      :key="index"
      size="10px"
      :value="progress"
      color="warning"
      :style="{ width: 100 / progressInfos.length + '%' }"
      stripe
    />
    <q-form @submit="onSubmit" class="q-gutter-md">
      <q-file
        name="photos"
        v-model="files"
        filled
        use-chips
        multiple
        :accept="CONFIG.fileType"
        :max-file-size="CONFIG.fileSize"
        :max-files="CONFIG.fileMax"
        label="Select images to upload"
        @rejected="onRejected"
      />
      <q-btn label="Submit" type="submit" color="primary" />
    </q-form>
  </q-page>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import { useCrudStore } from "../stores/crud";
import { usePopupStore } from "../stores/popup";
import { storage } from "../boot/fire";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import Edit from "../pages/EditPage.vue";
import { CONFIG } from "../helpers";

const crudStore = useCrudStore();
const popupStore = usePopupStore();
const uploaded = computed(() => crudStore.uploaded);
const current = computed(() => crudStore.current);

const files = ref([]);
let progressInfos = reactive([]);
const inProgress = ref(false);

const onSubmit = (evt) => {
  const data = [];
  const formData = new FormData(evt.target);

  for (const [name, value] of formData.entries()) {
    if (value.name.length > 0) {
      data.push({
        name,
        file: value,
      });
    }
  }
  if (data.length === 0) {
    console.log("nothing to upload");
  }
  inProgress.value = true;
  for (const [i, item] of data.entries()) {
    progressInfos[i] = 0;
    const _ref = storageRef(storage, item.file.name);
    const task = uploadBytesResumable(_ref, item.file, {
      contentType: item.file.type,
    });
    task.on(
      "state_changed",
      (snapshot) => {
        progressInfos[i] =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      },
      (error) => {
        console.log(error);
      },
      () => {
        getDownloadURL(task.snapshot.ref).then((downloadURL) => {
          crudStore.uploaded.push({ url: downloadURL, name: item.file.name });
          // console.log("URL ", downloadURL);
          // crudStore.populate(item.file.name, downloadURL);
          files.value.splice(
            files.value.findIndex((it) => it.name === item.file.name),
            1
          );
          // files.value.splice(i, 1);
          progressInfos[i] = 0;
        });
      }
    );
  }
};

const onRejected = (rejectedEntries) => {
  // Notify plugin needs to be installed
  // https://quasar.dev/quasar-plugins/notify#Installation
  console.log(rejectedEntries);
  // $q.notify({
  //   type: "negative",
  //   message: `${rejectedEntries.length} file(s) did not pass validation constraints`,
  // });
};

const edit = (obj) => {
  crudStore.current = obj;
  popupStore.showEdit = true;
};
</script>
