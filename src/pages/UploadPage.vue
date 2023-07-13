<template>
  <Edit v-if="crudStore.showEdit" :rec="crudStore.current" />

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
  const promises = [];
  const formData = new FormData(evt.target);

  for (const [name, value] of formData.entries()) {
    if (value.name.length > 0) {
      data.push(value);
    }
  }
  if (data.length === 0) {
    console.log("nothing to upload");
  }
  for (const [i, file] of data.entries()) {
    promises.push(uploadPromise(i, file));
  }
  inProgress.value = true;
  Promise.all(promises).then((results) => {
    console.log("waiting over");
    results.forEach((name) => {
      removeByProperty(files.value, "name", name);
    });
  });
};

const uploadPromise = (i, file) => {
  return new Promise((resolve, reject) => {
    const _ref = storageRef(storage, file.name);
    getDownloadURL(_ref)
      .then((url) => {
        const filename = rename(file.name);
        uploadTask(i, filename, file, resolve, reject);
      })
      .catch((error) => {
        if (error.code === "storage/object-not-found") {
          const filename = file.name;
          uploadTask(i, filename, file, resolve, reject);
        } else {
          reject(file.name);
        }
      });
  });
};

const uploadTask = (i, filename, file, resolve, reject) => {
  progressInfos[i] = 0;
  const _ref = storageRef(storage, filename);
  const task = uploadBytesResumable(_ref, file, {
    contentType: file.type,
    cacheControl: "max-age=604800",
  });
  task.on(
    "state_changed",
    (snapshot) => {
      progressInfos[i] =
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    },
    (error) => {
      reject(error);
    },
    () => {
      getDownloadURL(task.snapshot.ref).then((downloadURL) => {
        const data = {
          url: downloadURL,
          filename: filename,
          size: file.size,
          email: "milan.andrejevic@gmail.com", // FIXME auth user
          nick: emailNick("milan.andrejevic@gmail.com"),
        };
        resolve(file.name);
        crudStore.uploaded.push(data);
        progressInfos[i] = 0;
      });
    }
  );
};

const onRejected = (rejectedEntries) => {
  // Notify plugin needs to be installed
  // https://quasar.dev/quasar-plugins/notify#Installation
  rejectedEntries.forEach((it) => {
    console.log(it.failedPropValidation, it.file.name);
  });
  // $q.notify({
  //   type: "negative",
  //   message: `${rejectedEntries.length} file(s) did not pass validation constraints`,
  // });
};

const edit = (obj) => {
  crudStore.current = obj;
  crudStore.showEdit = true;
};
</script>
