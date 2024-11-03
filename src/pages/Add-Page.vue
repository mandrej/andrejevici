<template>
  <Edit-Record v-if="app.showEdit" :rec="app.currentEdit" />

  <q-page v-else class="q-pa-md">
    <div class="relative-position column q-pb-md">
      <div class="row absolute-top">
        <q-linear-progress
          v-for="(it, i) in Object.entries(progressInfos)"
          :key="i"
          size="15px"
          :value="it[1]"
          color="warning"
          :style="{ width: 100 / Object.entries(progressInfos).length + '%' }"
          :title="it[0]"
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
        @rejected="onValidationError"
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
      label="Tags to apply for next publish / or to merge with existing"
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
            @delete-record="deleteRecord"
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
  reFilename,
} from "../helpers";
import notify from "../helpers/notify";
import readExif from "../helpers/exif";
import PictureCard from "../components/Picture-Card.vue";
import AutoComplete from "../components/Auto-Complete.vue";

const EditRecord = defineAsyncComponent(() =>
  import("../components/Edit-Record.vue")
);

const app = useAppStore();
const meta = useValuesStore();
const auth = useUserStore();
const tagsToApply = computed({
  get() {
    return meta.tagsToApply;
  },
  set(newValue) {
    meta.tagsToApply = newValue;
  },
});

let files = ref([]);
let progressInfos = reactive({});

const alter = (filename) => {
  const id = uuid4();
  const [, name, ext] = filename.match(reFilename);
  return name + "_" + id.substring(id.length - 12) + ext;
};

const checkExists = (originalFilename) => {
  const reClean = new RegExp(/[\.\s\\){}\[\]]+/g);
  const [, name, ext] = originalFilename.match(reFilename);
  let filename = name.replace(/[(]+/g, "_").replace(reClean, "") + ext;

  return new Promise((resolve, reject) => {
    getDownloadURL(storageRef(storage, filename))
      .then(() => {
        // exist rename
        filename = alter(filename);
        resolve(filename);
      })
      .catch((error) => {
        if (error.code === "storage/object-not-found") {
          // does not exist
          resolve(filename);
        } else {
          notify({
            type: "external",
            html: true,
            message: `${originalFilename}<br/>${error}`,
            actions: [{ icon: "close", color: "white" }],
            timeout: 0,
          });
          reject(filename);
        }
      });
  });
};
const onSubmit = async (evt) => {
  const promises = [];
  const formData = new FormData(evt.target);

  if (files.value.length === 0) {
    notify({ message: `Nothing to upload` });
    return;
  }
  for (const [name, file] of formData.entries()) {
    // name = 'photos'
    if (file instanceof File) {
      promises.push(uploadTask(file));
    }
  }

  files.value = [];
  const results = await Promise.allSettled(promises);
  results.forEach((it) => {
    if (it.status === "rejected") {
      notify({
        type: "negative",
        message: `Rejected ${it.reason}.`,
        actions: [{ icon: "close", color: "white" }],
        timeout: 0,
      });
    }
    // removeByProperty(files.value, "name", it.value);
  });
  // progressInfos.entries
  //   .filter((it) => it[1] > 0)
  //   .forEach((it) => {
  //     console.log(it[0]);
  //   });
};

const uploadTask = (file) => {
  return new Promise(async (resolve, reject) => {
    const filename = await checkExists(file.name);
    progressInfos[file.name] = 0;
    const _ref = storageRef(storage, filename);
    const task = uploadBytesResumable(_ref, file, {
      contentType: file.type,
      cacheControl: "public, max-age=604800",
    });
    task.on(
      "state_changed",
      (snapshot) => {
        progressInfos[file.name] =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      },
      (error) => {
        progressInfos[file.name] = 0;
        reject(file.name);
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
          progressInfos[file.name] = 0;
          resolve(file.name);
          if (process.env.DEV) console.log("uploaded", file.name);
        });
      }
    );
  });
};

const onValidationError = (rejectedEntries) => {
  rejectedEntries.forEach((it) => {
    notify({
      type: "warning",
      message: `${it.file.name}: ${it.failedPropValidation} validation error`,
      actions: [{ icon: "close", color: "dark" }],
      timeout: 0,
    });
  });
};

const addNewTag = (inputValue, done) => {
  meta.addNewField(inputValue, "tags");
  done(inputValue);
};
const deleteRecord = (rec) => {
  delete progressInfos[rec.filename];
  app.deleteRecord(rec);
};
const editRecord = async (rec) => {
  // /**
  //  * PUBLISH RECORD
  //  * Add user email and tags: [] to new rec; read exif
  //  * See Edit-Record getExif
  //  */
  delete progressInfos[rec.filename];
  const exif = await readExif(rec.url);
  const tags = [...(tagsToApply.value || "")];
  rec = { ...rec, ...exif };
  // add flash tag if exif flash true
  if (rec.flash && tags.indexOf("flash") === -1) {
    tags.push("flash");
  }
  rec.tags = tags;
  rec.email = auth.user.email;

  fakeHistory();
  app.showEdit = true;
  app.currentEdit = rec;
  app.showEdit = true;
};
</script>
