<template>
  <q-dialog
    v-model="app.showEdit"
    :maximized="$q.screen.lt.md"
    transition-show="slide-up"
    transition-hide="slide-down"
    persistent
  >
    <q-card class="q-dialog-plugin full-width" style="max-width: 800px">
      <q-toolbar class="bg-grey-2 text-black row justify-between" bordered>
        <div>
          <q-btn
            color="primary"
            type="submit"
            label="Submit"
            @click="onSubmit"
          />
          <q-btn
            v-if="auth.user.isAdmin"
            class="q-ml-sm gt-sm"
            flat
            label="Read Exif"
            @click="getExif"
          />
        </div>
        <div>{{ formatBytes(tmp.size) }} {{ tmp.dim }}</div>
        <div>
          <q-btn flat round dense icon="close" @click="onCancel" />
        </div>
      </q-toolbar>
      <q-card-section>
        <q-form
          autofocus
          autocorrect="off"
          autocapitalize="off"
          autocomplete="off"
          spellcheck="false"
          @submit="onSubmit"
        >
          <div class="row q-col-gutter-md">
            <div class="col-xs-12 col-sm-4 gt-xs">
              <q-img
                :ratio="1"
                :src="
                  tmp.id ? smallsized + tmp.filename : fullsized + tmp.filename
                "
              >
                <template #error>
                  <img :src="fileBroken" />
                </template>
              </q-img>
            </div>
            <div class="col-xs-12 col-sm-8 col-8">
              <q-input
                v-model="tmp.headline"
                label="Headline"
                :placeholder="CONFIG.noTitle"
                :hint="`Image without name is called '${CONFIG.noTitle}'. Required`"
                @update:model-value="
                  (val) => {
                    tmp.headline =
                      val && val.charAt(0).toUpperCase() + val.slice(1);
                  }
                "
                @blur="
                  tmp.headline === undefined || tmp.headline.trim() === ''
                    ? (tmp.headline = CONFIG.noTitle)
                    : (tmp.headline = tmp.headline.trim())
                "
                autofocus
                clearable
                @clear="
                  (val) => {
                    tmp.headline = CONFIG.noTitle;
                  }
                "
              />
              <q-input v-model="tmp.filename" label="Filename" readonly />
              <Complete
                v-model="tmp.email"
                :options="app.emailValues"
                canadd
                label="Author"
                hint="Existing member can add freind's photo and email"
                :rules="[
                  (val) => !!val || 'Email is missing',
                  (val) => isValidEmail(val),
                ]"
                @update:model-value="(newValue) => (tmp.email = newValue)"
                @new-value="addNewEmail"
              />
              <q-input v-model="tmp.date" label="Date taken">
                <template #prepend>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy
                      cover
                      transition-show="scale"
                      transition-hide="scale"
                    >
                      <q-date v-model="tmp.date" mask="YYYY-MM-DD HH:mm">
                        <div class="row items-center justify-end">
                          <q-btn
                            v-close-popup
                            label="Close"
                            color="primary"
                            flat
                          />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
                <template #append>
                  <q-icon name="access_time" class="cursor-pointer">
                    <q-popup-proxy
                      cover
                      transition-show="scale"
                      transition-hide="scale"
                    >
                      <q-time
                        v-model="tmp.date"
                        mask="YYYY-MM-DD HH:mm"
                        format24h
                      >
                        <div class="row items-center justify-end">
                          <q-btn
                            v-close-popup
                            label="Close"
                            color="primary"
                            flat
                          />
                        </div>
                      </q-time>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>

            <div class="col-12">
              <Complete
                v-model="tmp.tags"
                :options="app.tagValues"
                canadd
                multiple
                label="Tags"
                @update:model-value="(newValue) => (tmp.tags = newValue)"
                @new-value="addNewTag"
              />
            </div>
            <div class="col-xs-12 col-sm-6">
              <Complete
                v-model="tmp.model"
                :options="app.modelValues"
                canadd
                label="Camera Model"
                @update:model-value="(newValue) => (tmp.model = newValue)"
                @new-value="addNewModel"
              />
            </div>
            <div class="col-xs-12 col-sm-6">
              <Complete
                v-model="tmp.lens"
                :options="app.lensValues"
                canadd
                label="Camera Lens"
                @update:model-value="(newValue) => (tmp.lens = newValue)"
                @new-value="addNewLens"
              />
            </div>
            <div class="col-xs-6 col-sm-4">
              <q-input
                v-model="tmp.focal_length"
                type="number"
                label="Focal length"
              />
            </div>

            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.iso" type="number" label="ISO [ASA]" />
            </div>
            <div class="col-xs-6 col-sm-4">
              <q-input
                v-model="tmp.aperture"
                type="number"
                step="0.1"
                label="Aperture"
              />
            </div>
            <div class="col-xs-6 col-sm-4">
              <q-input v-model="tmp.shutter" label="Shutter [s]" />
            </div>

            <div class="col-xs-6 col-sm-4">
              <q-input
                v-model="tmp.loc"
                label="Location [latitude, longitude]"
                clearable
              />
            </div>
            <div class="col-xs-6 col-sm-4 col-4 q-mt-sm">
              <q-checkbox v-model="tmp.flash" label="Flash fired?" />
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive } from "vue";
import {
  CONFIG,
  fullsized,
  smallsized,
  fileBroken,
  formatBytes,
  U,
} from "../helpers";
import readExif from "../helpers/exif";
import { useAppStore } from "../stores/app";
import { useAuthStore } from "../stores/auth";
import Complete from "./Complete.vue";

const emit = defineEmits(["editOk"]);
const props = defineProps({
  rec: Object,
});

const app = useAppStore();
const auth = useAuthStore();
const tmp = reactive({ ...props.rec });

const getExif = async () => {
  /**
   * Reread exif
   * See Add edit
   */
  const exif = await readExif(tmp.filename);
  const tags = tmp.tags || [];
  Object.keys(exif).forEach((k) => {
    tmp[k] = exif[k];
  });
  // add flash tag if exif flash true
  if (tmp.flash && tags.indexOf("flash") === -1) {
    tags.push("flash");
  }
  tmp.tags = tags;
  tmp.email = auth.user.email;
};
const isValidEmail = (val) => {
  const emailPattern =
    /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/;
  return emailPattern.test(val) || "Invalid email";
};

// new values
const addNewEmail = (inputValue) => {
  tmp.email = inputValue;
  app.values.email.push({
    count: 1,
    value: inputValue,
  });
};
const addNewTag = (inputValue) => {
  tmp.tags.push(inputValue);
  app.values.tags.push({
    count: 1,
    value: inputValue,
  });
};
const addNewModel = (inputValue) => {
  tmp.model = inputValue;
  app.values.model.push({
    count: 1,
    value: inputValue,
  });
};
const addNewLens = (inputValue) => {
  tmp.lens = inputValue;
  app.values.lens.push({
    count: 1,
    value: inputValue,
  });
};

window.onpopstate = function () {
  app.showEdit = false;
};
const onCancel = () => {
  app.showEdit = false;
};
const onSubmit = () => {
  tmp.tags = tmp.tags ? tmp.tags : [];
  app.saveRecord(tmp);
  emit("editOk", U + tmp.filename);
  app.showEdit = false;
};
</script>
