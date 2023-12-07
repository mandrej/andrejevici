<template>
  <swiper
    class="swiper"
    :keyboard="{
      enabled: true,
    }"
    :lazy="true"
    :navigation="true"
    :grab-cursor="true"
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
        style="z-index: 3000; background-color: rgba(0, 0, 0, 0.5)"
      >
        <q-btn
          v-if="auth.user.isAdmin"
          flat
          round
          class="text-white q-pa-md"
          icon="delete"
          @click="
            obj.thumb ? emit('confirmDelete', obj) : emit('deleteRecord', obj)
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
      <div class="swiper-zoom-container">
        <img :src="obj.url" loading="lazy" />
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
</template>

<script setup>
import { useQuasar } from "quasar";
import { ref } from "vue";
import { useAppStore } from "../stores/app";
import { useUserStore } from "../stores/user";
import { useRoute } from "vue-router";
import { formatBytes, removeHash, CONFIG, U } from "../helpers";
import notify from "../helpers/notify";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Navigation, Keyboard, Zoom } from "swiper/modules";

import "swiper/scss";
import "swiper/scss/navigation";
import "swiper/scss/zoom";

const emit = defineEmits(["carouselCancel", "confirmDelete", "deleteRecord"]);
const props = defineProps({
  filename: String,
  list: Array,
});

const $q = useQuasar();
const app = useAppStore();
const auth = useUserStore();
const route = useRoute();
const hash = ref(null);
const urlHash = new RegExp(/#(.*)?/); // matching string hash
const swiperRef = ref(null);

const modules = [Keyboard, Navigation, Zoom];

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
const caption = (rec) => {
  let tmp = "";
  if (rec.thumb) {
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
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  position: absolute;
  z-index: 2000;
  border-radius: 0 !important;
  max-width: 100vw;
  max-height: 100vh;
}

.swiper-slide {
  text-align: center;
  background: #000;
}

.swiper-slide img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
}
</style>
