<template>
  <q-dialog v-model="app.showCarousel" :maximized="true" persistent>
    <swiper
      :keyboard="true"
      :grab-cursor="true"
      :lazy="{
        loadOnTransitionStart: true,
        loadPrevNext: 3,
      }"
      :zoom="{
        maxRatio: 2,
      }"
      :modules="modules"
      @swiper="onSwiper"
      @slide-change="onSlideChange"
    >
      <swiper-slide
        v-for="obj in list"
        :key="obj.filename"
        :data-hash="U + obj.filename"
      >
        <div
          class="absolute-top row no-wrap justify-between"
          style="z-index: 1000"
        >
          <q-btn
            v-if="auth.user.isAdmin"
            flat
            round
            class="text-white q-pa-md"
            icon="delete"
            @click="
              obj.id ? emit('confirmDelete', obj) : emit('deleteRecord', obj)
            "
          />
          <div
            v-html="caption(obj)"
            class="col q-my-md text-white text-center ellipsis"
          ></div>

          <q-btn
            flat
            round
            class="text-white q-pa-md"
            icon="close"
            @click="onCancel"
          />
        </div>
        <div class="swiper-zoom-container" :data-swiper-zoom="zoomRatio(obj)">
          <img class="swiper-lazy" :data-src="fullsized + obj.filename" />
          <div class="swiper-lazy-preloader" />
        </div>
        <q-btn
          flat
          round
          class="absolute-bottom-right text-white q-pa-md"
          @click="$q.fullscreen.toggle()"
          :icon="$q.fullscreen.isActive ? 'fullscreen_exit' : 'fullscreen'"
        />
      </swiper-slide>
    </swiper>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from "quasar";
import { ref } from "vue";
import { useAppStore } from "../stores/app";
import { useAuthStore } from "../stores/auth";
import { useRoute } from "vue-router";
import { fullsized, formatBytes, removeHash, CONFIG, U } from "../helpers";
import notify from "../helpers/notify";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Lazy, Zoom, Keyboard } from "swiper";

import "swiper/scss";
import "swiper/scss/lazy";
import "swiper/scss/zoom";

const emit = defineEmits(["carouselCancel", "confirmDelete", "deleteRecord"]);
const props = defineProps({
  filename: String,
  list: Array,
});

const $q = useQuasar();
const app = useAppStore();
const auth = useAuthStore();
const route = useRoute();
const hash = ref(null);
const urlHash = new RegExp(/#(.*)?/); // matching string hash
const swiperRef = ref(null);

const modules = [Lazy, Zoom, Keyboard];

const onSwiper = (sw) => {
  swiperRef.value = sw;
  const index = props.list.findIndex((x) => x.filename === props.filename);
  if (index === -1) {
    notify({
      type: "negative",
      timeout: 10000,
      message: `${props.filename} couldn't be found in first ${CONFIG.limit} records`,
    });
  } else {
    if (index === 0) {
      onSlideChange(sw);
    } else {
      sw.slideTo(index);
    }
  }
};
const onSlideChange = (sw) => {
  let url = route.fullPath;
  const slide = sw.slides[sw.activeIndex];
  hash.value = slide.dataset.hash;
  const sufix = "#" + hash.value;
  if (urlHash.test(url)) {
    url = url.replace(urlHash, sufix);
  } else {
    url += sufix;
  }
  window.history.replaceState(history.state, null, url);
};
const zoomRatio = (rec) => {
  if (swiperRef.value && rec.dim) {
    const wRatio = rec.dim[0] / swiperRef.value.width;
    const hRatio = rec.dim[1] / swiperRef.value.height;
    return Math.max(wRatio, hRatio, 1);
  }
  return 2;
};
const caption = (rec) => {
  let tmp = "";
  if (rec.id) {
    const { headline, aperture, shutter, iso, model, lens } = rec;
    tmp += headline + "<br/>";
    tmp += aperture ? " f" + aperture : "";
    tmp += shutter ? " " + shutter + "s" : "";
    tmp += iso ? " " + iso + " ASA" : "";
    if ($q.screen.gt.sm) {
      tmp += model ? " " + model : "";
      tmp += lens ? " " + lens : "";
    }
  } else {
    tmp += formatBytes(rec.size);
  }
  return tmp;
};

window.onpopstate = function () {
  emit("carouselCancel", hash.value);
  app.showCarousel = false;
};
const onCancel = () => {
  removeHash();
  emit("carouselCancel", hash.value);
  app.showCarousel = false;
};
</script>

<style scoped>
.swiper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: rgb(0.3, 0.3, 0.3) !important;
}
</style>
