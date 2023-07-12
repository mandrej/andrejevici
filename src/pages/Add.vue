<template>
  <Edit v-if="app.showEdit" :rec="current" />
  <Carousel
    v-if="app.showCarousel"
    :filename="currentFileName"
    :list="uploaded"
    @carousel-cancel="carouselCancel"
    @delete-record="app.deleteRecord"
  />

  <q-page class="q-pa-md">
    <div
      class="rounded-borders relative-position bg-grey-2 column justify-center items-center"
      style="height: 150px"
    >
      <div v-if="progressInfos.length > 0">
        Upload in progress. Plase wait ...
      </div>
      <div v-else class="text-body1 text-center" style="width: 70%">
        Drag your images here to upload, or click to browse. Then publish image
        on site. Accepts only jpg (jpeg) files less then 4 Mb in size.
      </div>
      <input
        id="files"
        type="file"
        multiple
        name="photos"
        @change="filesChange"
        :disabled="inProgress"
      />
      <div class="row absolute-bottom">
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

    <Complete
      v-model="tagsToApply"
      :options="app.tagValues"
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
            @delete-record="app.deleteRecord"
            @edit-record="editRecord"
          />
        </div>
      </transition-group>
    </div>
  </q-page>
</template>

<script setup>
import { scroll } from "quasar";
import { defineAsyncComponent, computed, reactive, ref } from "vue";
import { useAppStore } from "../stores/app";
import { useAuthStore } from "../stores/auth";
import { CONFIG, fakeHistory } from "../helpers";
import api from "../helpers/api";
import notify from "../helpers/notify";
import readExif from "../helpers/exif";
import Card from "../components/Card.vue";
import Complete from "../components/Complete.vue";
import Carousel from "../components/Carousel.vue";

const Edit = defineAsyncComponent(() => import("../components/Edit.vue"));

const { getScrollTarget, setVerticalScrollPosition } = scroll;

const app = useAppStore();
const auth = useAuthStore();

const tagsToApply = computed({
  get() {
    return app.tagsToApply;
  },
  set(newValue) {
    app.tagsToApply = newValue;
  },
});

let files = reactive([]);
let progressInfos = reactive([]);
const inProgress = ref(false);

const uploaded = computed(() => app.uploaded);
const current = computed(() => app.current);
const currentFileName = ref(null);

const filesChange = (evt) => {
  /**
   * 0: File
      name: "DSC_8082-22-03-14-819.jpg"
      size: 1858651
      type: "image/jpeg"
   */
  let fileList = evt.target.files;
  let fieldName = evt.target.name; // photos
  if (!fileList.length) return;

  Array.from(fileList).map((file) => {
    if (file.type !== CONFIG.fileType) {
      notify({
        type: "warning",
        message: `${file.name} is of unsupported file type`,
      });
    } else if (file.size > CONFIG.fileSize) {
      notify({ type: "warning", message: `${file.name} is too big` });
    } else {
      files.push(file);
    }
  });

  if (files.length > CONFIG.fileMax) {
    notify({
      type: "warning",
      message: `Max ${CONFIG.fileMax} files allowed at the time`,
    });
    files.splice(CONFIG.fileMax);
  }
  upload(fieldName, files);
};

const upload = async (name, batch) => {
  const promises = [];
  inProgress.value = true;

  for (let i = 0; i < batch.length; i++) {
    let formData = new FormData();
    formData.append(name, batch[i]);
    progressInfos[i] = 0;
    const result = api
      .post("add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          progressInfos[i] = evt.loaded / evt.total;
        },
      })
      .catch((err) => {
        notify({ type: "negative", message: err.message });
      });
    promises.push(result);
  }

  const results = await Promise.all(promises);
  results.map((result, i) => {
    if (result && result.status === 200) {
      app.uploaded.push(result.data);
    }
    progressInfos[i] = 0;
  });

  files.length = 0;
  progressInfos.length = 0;
  inProgress.value = false;
};

const addNewTag = (inputValue) => {
  // new value
  tagsToApply.value.push(inputValue);
  app.values.tags.push({
    count: 1,
    value: inputValue,
  });
};
const editRecord = async (rec) => {
  /**
   * PUBLISH RECORD
   * Add user email and tags: [] to new rec; read exif
   * See Edit getExif
   */
  const exif = await readExif(rec.filename);
  const tags = [...(tagsToApply.value || "")];
  Object.keys(exif).forEach((k) => {
    rec[k] = exif[k];
  });
  // add flash tag if exif flash true
  if (rec.flash && tags.indexOf("flash") === -1) {
    tags.push("flash");
  }
  rec.tags = tags;
  rec.email = auth.user.email;

  app.current = rec;
  fakeHistory();
  app.showEdit = true;
};

const carouselShow = (filename) => {
  currentFileName.value = filename;
  fakeHistory();
  app.showCarousel = true;
};
const carouselCancel = (hash) => {
  app.showCarousel = false;
  const el = document.querySelector("#" + hash);
  if (!el) return;
  const target = getScrollTarget(el);
  setVerticalScrollPosition(target, el.offsetTop, 500);
};
</script>

<style scoped>
input#files {
  opacity: 0;
  width: 100%;
  height: inherit;
  position: absolute;
  cursor: pointer;
}
.disabled,
[disabled] {
  opacity: 0 !important;
}
</style>
