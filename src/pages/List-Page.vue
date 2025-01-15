<template>
  <q-page v-bind="pageStyle(grid)">
    <swiper-container
      v-bind="options(grid)"
      @swiperinit="onSwiper"
      @swiperslidechange="onSlideChange"
    >
      <swiper-slide
        v-for="obj in objects"
        :key="obj.filename"
        :data-hash="U + obj.filename"
      >
        <div v-if="grid" class="grid">
          <img :src="obj.thumb" @click="grid = false" @error="onError" />
        </div>
        <div v-else class="swiper-zoom-container">
          <img :src="obj.url" loading="lazy" @load="onLoad" @error="onError" />
          <div class="swiper-lazy-preloader" />
        </div>
      </swiper-slide>
    </swiper-container>
  </q-page>
</template>

<script setup>
import { ref, computed } from "vue";
import { useAppStore } from "../stores/app";
import { fileBroken, U } from "../helpers";
import { register } from "swiper/element/bundle";
import { Keyboard, Zoom } from "swiper/modules";

const app = useAppStore();
const objects = computed(() => app.objects);
const grid = ref(true);

register();
let swiper = null;
const common = {
  keyboard: {
    enabled: true,
  },
  grabCursor: true,
  zoom: {
    maxRatio: 2,
  },
  lazy: {
    loadPrevNext: true,
    loadPrevNextAmount: 3,
  },
  slidesPerView: 1,
  spaceBetween: 16,
};

const options = (grid) => {
  return grid
    ? {
        ...common,
        direcrion: "vertical",
        slidesPerView: 1,
        spaceBetween: 16,
        grid: {
          rows: 300,
          fill: "row",
        },
        breakpoints: {
          640: {
            slidesPerView: 2,
          },
          768: {
            slidesPerView: 3,
          },
          1024: {
            slidesPerView: 3,
          },
        },
      }
    : {
        ...common,
        direcrion: "horizontal",
        slidesPerView: 1,
        grid: {
          rows: 1,
        },
      };
};

const pageStyle = (grid) => {
  return grid
    ? {
        class: "q-pa-md",
        style: {
          position: "relative",
        },
      }
    : {
        class: "q-pa-none, bg-black",
        style: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          position: "absolute",
          zIndex: 2000,
          height: "100vh",
          overflow: "hidden",
        },
      };
};

const onSwiper = (e) => {
  swiper = e.detail[0]; // instance
  Object.assign(swiper, {
    modules: [Keyboard, Zoom],
  });
  // position(app.markerFileName);
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
</script>

<style scoped>
swiper-container {
  width: 100%;
  height: 100%;
  margin-left: auto;
  margin-right: auto;
}
swiper-slide {
  display: flex;
  justify-content: center;
  align-items: center;
}
.grid img {
  display: block;
  width: 100%;
  height: 330px;
  object-fit: cover;
}
.swiper-zoom-container img {
  width: 100%;
  height: 100%;
  /* max-width: 100%;
  max-height: 100%; */
  object-fit: contain;
}
</style>
