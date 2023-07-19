<template>
  <Edit v-if="crudStore.showEdit" :rec="current" />
  <Carousel
    v-if="crudStore.showCarousel"
    :filename="currentFileName"
    :list="uploaded"
    @carousel-cancel="carouselCancel"
    @delete-record="crudStore.deleteRecord"
  />

  <q-page class="q-pa-md">
    <div class="relative-position column" style="height: 10px">
      <!-- <div v-if="progressInfos.length > 0">
        Upload in progress. Plase wait ...
      </div>
      <div v-else class="text-body1 text-center" style="width: 70%">
        Drag your images here to upload, or click to browse. Then publish image
        on site. Accepts only jpg (jpeg) files less then 4 Mb in size.
      </div> -->
      <div class="row absolute-top">
        <q-linear-progress
          v-for="(progress, index) in progressInfos"
          :key="index"
          size="10px"
          :value="progress"
          color="warning"
          :style="{ width: 100 / progressInfos.length + '%' }"
          stripe
        />
      </div>
    </div>

    <q-form @submit="onSubmit" class="q-gutter-md">
      <q-file
        name="photos"
        v-model="files"
        multiple
        :accept="CONFIG.fileType"
        :max-file-size="CONFIG.fileSize"
        :max-files="CONFIG.fileMax"
        label="Select images to upload"
        @rejected="onRejected"
      />
      <div class="column">
        <q-btn
          label="Upload"
          type="submit"
          color="primary"
          class="col self-end"
        />
      </div>
    </q-form>

    <Complete
      v-model="tagsToApply"
      :options="valuesStore.tagValues"
      canadd
      multiple
      label="Tags to apply for next publish"
      hint="You can add / remove tag later"
      @update:model-value="(newValue) => (tagsToApply = newValue)"
      @new-value="addNewTag"
    />

    <div class="q-mt-md">
      <transition-group tag="div" class="row q-col-gutter-md" name="fade">
        <div
          v-for="rec in uploaded"
          :key="rec.filename"
          class="col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-2"
        >
          <Card
            :rec="rec"
            :canManage="true"
            @carousel-show="carouselShow"
            @delete-record="crudStore.deleteRecord"
            @edit-record="editRecord"
          />
        </div>
      </transition-group>
    </div>
  </q-page>
</template>

<script setup>
import { scroll } from "quasar";
import uuid4 from "uuid4";
import { defineAsyncComponent, computed, reactive, ref } from "vue";
import { storage } from "../boot/fire";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { useCrudStore } from "../stores/crud";
import { useValuesStore } from "../stores/values";
import { useAuthStore } from "../stores/auth";
import {
  CONFIG,
  fakeHistory,
  removeByProperty,
  emailNick,
  reFilename,
} from "../helpers";
import notify from "../helpers/notify";
import readExif from "../helpers/exif";
import Card from "../components/Card.vue";
import Complete from "../components/Complete.vue";
import Carousel from "../components/Carousel.vue";

const Edit = defineAsyncComponent(() => import("../components/Edit.vue"));

const { getScrollTarget, setVerticalScrollPosition } = scroll;

const crudStore = useCrudStore();
const valuesStore = useValuesStore();
const auth = useAuthStore();

const uploaded = computed(() => crudStore.uploaded);
const current = computed(() => crudStore.current);

let files = ref([]);
let progressInfos = reactive([]);
const inProgress = ref(false);

const tagsToApply = computed({
  get() {
    return valuesStore.tagsToApply;
  },
  set(newValue) {
    valuesStore.tagsToApply = newValue;
  },
});

const currentFileName = ref(null);

const onSubmit = (evt) => {
  const data = [];
  const promises = [];
  const formData = new FormData(evt.target);
  console.log(formData);

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
        // const urlParams = new URLSearchParams(downloadURL);
        // console.log(urlParams.get("token"));
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

const rename = (filename) => {
  const id = uuid4();
  const [name, ext] = filename.match(reFilename);
  if (!ext) ext = "jpg";
  return name + "_" + id.substring(id.length - 12) + "." + ext;
};

const addNewTag = (inputValue) => {
  // new value
  tagsToApply.value.push(inputValue);
  valuesStore.values.tags.push({
    count: 1,
    value: inputValue,
  });
};
const editRecord = async (rec) => {
  // /**
  //  * PUBLISH RECORD
  //  * Add user email and tags: [] to new rec; read exif
  //  * See Edit getExif
  //  */
  const exif = await readExif(rec.url);
  const tags = [...(tagsToApply.value || "")];
  Object.keys(exif).forEach((k) => {
    rec[k] = exif[k];
  });
  // // add flash tag if exif flash true
  if (rec.flash && tags.indexOf("flash") === -1) {
    tags.push("flash");
  }
  rec.tags = tags;
  rec.email = auth.user.email;

  // crudStore.current = rec;
  fakeHistory();
  crudStore.showEdit = true;
  crudStore.current = rec;
  crudStore.showEdit = true;
};

const carouselShow = (filename) => {
  currentFileName.value = filename;
  fakeHistory();
  crudStore.showCarousel = true;
};
const carouselCancel = (hash) => {
  crudStore.showCarousel = false;
  const el = document.querySelector("#" + hash);
  if (!el) return;
  const target = getScrollTarget(el);
  setVerticalScrollPosition(target, el.offsetTop, 500);
};
</script>

<style scoped>
/* input#files {
  opacity: 0;
  width: 100%;
  height: inherit;
  position: absolute;
  cursor: pointer;
}
.disabled,
[disabled] {
  opacity: 0 !important;
} */
</style>
