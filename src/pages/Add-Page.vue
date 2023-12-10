<template>
  <Edit-Record v-if="app.showEdit" :rec="current" />
  <Swiper-View
    v-if="app.showCarousel"
    :filename="app.currentFileName"
    :list="app.uploaded"
    @carousel-cancel="useCarouselCancel"
    @delete-record="app.deleteRecord"
  />

  <q-page v-else class="q-pa-md">
    <div class="relative-position column" style="height: 10px">
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
        use-chips
        multiple
        :accept="CONFIG.fileType"
        :max-file-size="CONFIG.fileSize"
        :max-files="CONFIG.fileMax"
        label="Select images to upload"
        hint="Drag your images above to upload, or click to browse and select. Then
          publish image on site. Accepts maximum 10 jpg (jpeg) files less then 4
          Mb in size."
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

    <Auto-Complete
      v-model="tagsToApply"
      :options="meta.tagsValues"
      canadd
      multiple
      label="Tags to apply for next publish"
      hint="You can add / remove tag later"
      @new-value="addNewTag"
    />

    <div class="q-mt-md">
      <transition-group tag="div" class="row q-col-gutter-md" name="fade">
        <div
          v-for="rec in app.uploaded"
          :key="rec.filename"
          class="col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-2"
        >
          <Picture-Card
            :rec="rec"
            :canManage="true"
            @carousel-show="useCarouselShow"
            @delete-record="app.deleteRecord"
            @edit-record="editRecord"
          />
        </div>
      </transition-group>
    </div>
  </q-page>
</template>

<script setup>
import uuid4 from "uuid4";
import { defineAsyncComponent, computed, reactive, ref } from "vue";
import { storage } from "../boot/fire";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { useAppStore } from "../stores/app";
import { useValuesStore } from "../stores/values";
import { useUserStore } from "../stores/user";
import {
  CONFIG,
  fakeHistory,
  removeByProperty,
  emailNick,
  reClean,
  reFilename,
} from "../helpers";
import { useCarouselShow, useCarouselCancel } from "../helpers/common";
import notify from "../helpers/notify";
import readExif from "../helpers/exif";
import PictureCard from "../components/Picture-Card.vue";
import AutoComplete from "../components/Auto-Complete.vue";
import SwiperView from "../components/Swiper-View.vue";

const EditRecord = defineAsyncComponent(() =>
  import("../components/Edit-Record.vue")
);

const app = useAppStore();
const meta = useValuesStore();
const auth = useUserStore();
const current = computed(() => app.current);
const tagsToApply = computed({
  get() {
    return meta.tagsToApply;
  },
  set(newValue) {
    meta.tagsToApply = newValue;
  },
});

let files = ref([]);
let progressInfos = reactive([]);
const inProgress = ref(false);

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
    notify({ message: `Nothing to upload` });
  }
  for (const [i, file] of data.entries()) {
    // console.log(file);
    promises.push(uploadPromise(i, file));
  }
  inProgress.value = true;
  Promise.all(promises)
    .then((results) => {
      results.forEach((it) => {
        removeByProperty(files.value, "name", it);
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

const uploadPromise = (i, file) => {
  return new Promise((resolve, reject) => {
    const [, name, ext] = file.name.match(reFilename);
    let filename = name.replace(reClean, "") + ext;
    const _ref = storageRef(storage, filename);
    getDownloadURL(_ref)
      .then((url) => {
        filename = alter(filename);
        uploadTask(i, filename, file).then(() => {
          resolve(file.name);
        });
      })
      .catch((error) => {
        if (error.code === "storage/object-not-found") {
          uploadTask(i, filename, file).then(() => {
            resolve(file.name);
          });
        } else {
          resolve(file.name);
        }
      });
  });
};

const uploadTask = async (i, filename, file) => {
  progressInfos[i] = 0;
  const _ref = storageRef(storage, filename);
  const task = uploadBytesResumable(_ref, file, {
    contentType: file.type,
    cacheControl: "public, max-age=604800",
  });
  task.on(
    "state_changed",
    (snapshot) => {
      progressInfos[i] =
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    },
    (error) => {
      console.log(error);
      progressInfos[i] = 0;
    },
    () => {
      getDownloadURL(task.snapshot.ref).then((downloadURL) => {
        // const urlParams = new URLSearchParams(downloadURL);
        // console.log(urlParams.get("token"));
        const data = {
          url: downloadURL,
          filename: filename,
          size: file.size,
          email: auth.user.email,
          nick: emailNick(auth.user.email),
        };
        app.uploaded.push(data);
        progressInfos[i] = 0;
      });
    }
  );
};

const onRejected = (rejectedEntries) => {
  rejectedEntries.forEach((it) => {
    notify({
      type: "warning",
      message: `${it.file.name}: ${it.failedPropValidation} validation error`,
      actions: [{ icon: "close", color: "dark" }],
      timeout: 0,
    });
  });
  // notify({
  //   type: "warning",
  //   timeout: 0,
  //   actions: [{ icon: "close", color: "white" }],
  //   message: `${rejectedEntries.length} file(s) did not pass validation constraints`,
  // });
};

const alter = (filename) => {
  const id = uuid4();
  const [, name, ext] = filename.match(reFilename);
  return name + "_" + id.substring(id.length - 12) + ext;
};

const addNewTag = (inputValue, done) => {
  meta.addNewTag(inputValue);
  done(inputValue);
};
const editRecord = async (rec) => {
  // /**
  //  * PUBLISH RECORD
  //  * Add user email and tags: [] to new rec; read exif
  //  * See Edit-Record getExif
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

  // app.current = rec;
  fakeHistory();
  app.showEdit = true;
  app.current = rec;
  app.showEdit = true;
};
</script>
