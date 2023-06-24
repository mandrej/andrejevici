<template>
  <q-page class="flex flex-center column">
    <!-- <input
        id="files"
        type="file"
        multiple
        name="photos"
        @change="filesChange"
        accept="image/jpeg"
        /> -->
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
import { storage } from "../boot/fire";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { CONFIG } from "../helpers";

const crudStore = useCrudStore();
// const uploaded = computed(() => crudStore.uploaded);
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
    // console.log(item.file);
    progressInfos[i] = 0;
    const _ref = storageRef(storage, item.file.name);
    // console.log(_ref);
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
          console.log("URL ", downloadURL);
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
</script>
