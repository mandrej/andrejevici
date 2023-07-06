<template>
  <Edit v-if="popupStore.showEdit" :rec="crudStore.current" />

  <q-page class="flex flex-center column">
    <div class="row">
      <div v-for="(obj, i) in uploaded" :key="i">
        <q-img
          :src="obj.url"
          style="display: block; height: 150px; width: 150px"
        />
        <q-btn @click="edit(obj)">Publish</q-btn>
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
      <q-btn label="Upload" type="submit" color="primary" />
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
import uuid4 from "uuid4";
import { CONFIG, removeByProperty, emailNick, reFilename } from "../helpers";

const crudStore = useCrudStore();
const popupStore = usePopupStore();
const uploaded = computed(() => crudStore.uploaded);

const files = ref([]);
let progressInfos = reactive([]);
const inProgress = ref(false);

const rename = (filename) => {
  const id = uuid4();
  const [name, ext] = filename.match(reFilename);
  if (!ext) ext = "jpg";
  return name + "_" + id.substring(id.length - 12) + "." + ext;
};

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
    const _ref = storageRef(storage, item.file.name);
    getDownloadURL(_ref)
      .then((url) => {
        const filename = rename(item.file.name);
        removeByProperty(files.value, "name", item.file.name);
        upload(i, filename, item.file);
      })
      .catch((error) => {
        if (error.code === "storage/object-not-found") {
          removeByProperty(files.value, "name", item.file.name);
          upload(i, item.file.name, item.file);
        } else {
          console.log(error);
        }
      });
  }
};

const upload = (i, filename, file) => {
  progressInfos[i] = 0;
  const _ref = storageRef(storage, filename);
  const task = uploadBytesResumable(_ref, file, {
    contentType: file.type,
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
        crudStore.uploaded.push({
          url: downloadURL,
          filename: filename,
          size: file.size,
          email: "milan.andrejevic@gmail.com", // FIXME auth user
          nick: emailNick("milan.andrejevic@gmail.com"),
        });
        progressInfos[i] = 0;
      });
    }
  );
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
