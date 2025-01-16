<template>
  <q-page class="q-pa-md">
    <q-banner
      v-if="app.error && app.error === 'empty'"
      class="fixed-center text-center bg-warning q-pa-md"
      style="z-index: 100"
      rounded
    >
      <q-icon name="error_outline" size="4em" />
      <div class="text-h6">No data found</div>
      <div>for current filter/ search</div>
    </q-banner>
    <q-banner
      v-else-if="app.error && app.error !== 'empty'"
      class="fixed-center text-center bg-warning q-pa-md"
      style="z-index: 100"
      rounded
    >
      <q-icon name="error_outline" size="4em" />
      <div class="text-h6">Something went wrong ...</div>
      <div>{{ app.error }}</div>
    </q-banner>

    <swiper-container
      v-bind="options"
      @swiperinit="onSwiper"
      @swiperslidechange="onSlideChange"
    >
      <swiper-slide
        v-for="item in objects"
        :key="item.filename"
        :data-hash="U + item.filename"
      >
        <Picture-Card
          :rec="item"
          :canManage="isAuthorOrAdmin(item)"
          :canMergeTags="tagsToApplyExist()"
          @carousel-show="emit('carouselShow', item.filename)"
          @edit-record="emit('editRecord', item)"
          @merge-tags="mergeTags(item)"
          @confirm-delete="emit('confirmDelete', item)"
          @delete-record="app.deleteRecord"
        />
      </swiper-slide>
    </swiper-container>
  </q-page>
</template>

<script setup>
import { ref, computed, watchEffect } from "vue";
import { useAppStore } from "../stores/app";
import { useUserStore } from "../stores/user";
import { useValuesStore } from "../stores/values";
import { fileBroken, U } from "../helpers";
import { register } from "swiper/element/bundle";
import { Keyboard, Zoom } from "swiper/modules";
import PictureCard from "src/components/Picture-Card.vue";

const emit = defineEmits([
  "carouselShow",
  "carouselCancel",
  "editRecord",
  "editOk",
  "confirmDelete",
]);

const app = useAppStore();
const auth = useUserStore();
const meta = useValuesStore();
const objects = computed(() => app.objects);

register();
let swiper = null;
const options = {
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
  slidesPerView: 3,
  spaceBetween: 16,
  grid: {
    rows: 100,
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

const isAuthorOrAdmin = (rec) => {
  if (!auth.user) return false;
  return (auth.user.isAdmin || auth.user.email === rec.email) && app.editMode;
};

const tagsToApplyExist = () => {
  return Array.isArray(meta.tagsToApply) && auth.user && auth.user.isAdmin;
};

const mergeTags = (rec) => {
  rec.tags = Array.from(new Set([...meta.tagsToApply, ...rec.tags])).sort();
  app.saveRecord(rec);
  emit("editOk", U + rec.filename);
};
</script>

<style scoped>
swiper-container {
  width: 100%;
  height: 100%;
  margin-left: auto;
  margin-right: auto;
}
/* swiper-slide {
  display: flex;
  justify-content: center;
  align-items: center;
} */
swiper-slide img {
  display: block;
  width: 100%;
  height: 300px;
  object-fit: cover;
}
</style>
