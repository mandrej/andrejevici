<template>
  <q-page class="flex flex-center column">
    <div class="row">Upload</div>
    <q-linear-progress
      v-for="(progress, index) in progressInfos"
      :key="index"
      size="10px"
      :value="progress"
      color="warning"
      :style="{ width: 100 / progressInfos.length + '%' }"
      stripe
    />
    <div>
      <input
        id="files"
        type="file"
        multiple
        name="photos"
        @change="filesChange"
        accept="image/jpeg"
      />
    </div>
    <!-- <q-btn type="button" :click="upload">Upload</q-btn> -->
  </q-page>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import { useCrudStore } from "../stores/crud";
import { storage } from "../boot/fire";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { CONFIG } from "../helpers";

const crudStore = useCrudStore();
const uploaded = computed(() => crudStore.uploaded);
let files = reactive([]);
let progressInfos = reactive([]);
const inProgress = ref(false);

const filesChange = (evt) => {
  /**
   * 0: File
      name: "DSC_8082-22-03-14-819.jpg"
      size: 1858651
      type: "image/jpeg"
   */
  let fileList = evt.target.files;
  // let fieldName = evt.target.name; // photos
  if (!fileList.length) return;

  Array.from(fileList).map((file) => {
    if (file.type !== CONFIG.fileType) {
      console.log(`${file.name} is of unsupported file type`);
      // notify({
      //   type: "warning",
      //   message: `${file.name} is of unsupported file type`,
      // });
    } else if (file.size > CONFIG.fileSize) {
      console.log(`${file.name} is too big`);
      // notify({ type: "warning", message: `${file.name} is too big` });
    } else {
      files.push(file);
    }
  });

  if (files.length > CONFIG.fileMax) {
    console.log(`Max ${CONFIG.fileMax} files allowed at the time`);
    // notify({
    //   type: "warning",
    //   message: `Max ${CONFIG.fileMax} files allowed at the time`,
    // });
    files.splice(CONFIG.fileMax);
  }
  upload();
};

const upload = async () => {
  console.log(files);
  if (files.length === 0) {
    console.log("nothing to upload");
  }
  // const promises = [];
  // inProgress.value = true;
  for (let i = 0; i < files.length; i++) {
    // console.log(files[i]);
    // progressInfos[i] = 0;
    const _ref = storageRef(storage, files[i].name);
    // console.log(_ref);
    const task = await uploadBytes(_ref, files[i], {
      contentType: files[i].type,
    });
    console.log(task);
  }
};
</script>
