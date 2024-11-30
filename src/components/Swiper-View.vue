<template>
  <swiper-container
    class="swiper"
    :keyboard="{
      enabled: true,
    }"
    :grab-cursor="true"
    :zoom="{
      maxRatio: 2,
    }"
    :lazy="true"
    @swiperinit="onSwiper"
    @swiperslidechange="onSlideChange"
  >
    <swiper-slide
      v-for="obj in objects"
      :key="obj.filename"
      :data-hash="U + obj.filename"
    >
      <div
        v-show="!full"
        class="absolute-top row no-wrap justify-between"
        style="z-index: 3000; background-color: rgba(0, 0, 0, 0.5)"
      >
        <q-btn
          v-if="auth.user && auth.user.isAdmin"
          flat
          round
          class="text-white q-pa-sm"
          icon="delete"
          @click="emit('confirmDelete', obj)"
        />
        <div
          v-html="caption(obj)"
          class="col q-my-sm text-white text-center ellipsis"
        ></div>

        <q-btn
          flat
          round
          class="text-white q-pa-sm"
          icon="close"
          @click="onCancel"
        />
      </div>
      <div class="swiper-zoom-container">
        <img :src="obj.url" loading="lazy" @load="onLoad" @error="onError" />
        <div class="swiper-lazy-preloader" />
      </div>
      <q-btn
        flat
        round
        class="absolute-bottom-right text-white q-pa-md"
        @click="$q.fullscreen.toggle()"
        :icon="full ? 'fullscreen_exit' : 'fullscreen'"
      />
    </swiper-slide>
  </swiper-container>
</template>

<script setup>
import { useQuasar } from "quasar";
import { storeToRefs } from "pinia";
import { ref, watch } from "vue";
import { useAppStore } from "../stores/app";
import { useUserStore } from "../stores/user";
import { useRoute } from "vue-router";
import { fileBroken, U } from "../helpers";
import { register } from "swiper/element/bundle";
import { Keyboard, Zoom } from "swiper/modules";

import "swiper/scss";
import "swiper/scss/zoom";

const props = defineProps({
  objects: Array,
});
const emit = defineEmits(["carouselCancel", "confirmDelete"]);

const $q = useQuasar();
const app = useAppStore();
const auth = useUserStore();
const route = useRoute();
const hash = ref(null);
const urlHash = new RegExp(/#(.*)?/); // matching string hash
const full = ref(false);
const { markerFileName } = storeToRefs(app);

register({ modules: [Keyboard, Zoom] });
let swiper = null;

const onSwiper = (e) => {
  swiper = e.detail[0]; // instance
  position(app.markerFileName);
};

watch(markerFileName, (val) => {
  position(val);
});

const position = (markerFileName) => {
  const index = props.objects.findIndex((x) => x.filename === markerFileName);
  if (index === 0) {
    onSlideChange();
  } else if (index > 0) {
    swiper.slideTo(index, 0);
  }
};
const onSlideChange = (e) => {
  let url = route.fullPath;
  const slide = swiper.slides[swiper.activeIndex];
  if (slide) {
    hash.value = slide.dataset.hash;
    const sufix = "#" + hash.value;
    if (urlHash.test(url)) {
      url = url.replace(urlHash, sufix);
    } else {
      url += sufix;
    }
    window.history.replaceState(history.state, null, url);
  }
};
const onLoad = (e) => {
  // calculate image dimension
  const dim1 = [e.target.width, e.target.height];
  const dim0 = [e.target.naturalWidth, e.target.naturalHeight];
  const wRatio = dim0[0] / dim1[0];
  const hRatio = dim0[1] / dim1[1];

  const container = e.target.closest(".swiper-zoom-container");
  container.dataset.swiperZoom = Math.max(wRatio, hRatio, 1);
};
const onError = (e) => {
  e.target.src = fileBroken;
};
const caption = (rec) => {
  let tmp = "";
  const { headline, aperture, shutter, iso, model, lens } = rec;
  tmp += headline + "<br/>";
  tmp += aperture ? " f" + aperture : "";
  tmp += shutter ? " " + shutter + "s" : "";
  tmp += iso ? " " + iso + " ASA" : "";
  if ($q.screen.gt.sm) {
    tmp += model ? " " + model : "";
    tmp += lens ? " " + lens : "";
  }
  return tmp;
};

window.onpopstate = function () {
  app.showCarousel = false;
  emit("carouselCancel", hash.value);
};
const onCancel = () => {
  app.showCarousel = false;
  emit("carouselCancel", hash.value);
};

watch(
  () => $q.fullscreen.isActive,
  (val) => {
    full.value = val;
  }
);
</script>

<style scoped>
swiper-container {
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

swiper-slide {
  text-align: center;
  background: #000;
}
swiper-slide img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
}
</style>
