<template>
  <q-page class="q-pa-md">
    <Edit-Record v-if="app.showEdit" :rec="app.currentEdit" @edit-ok="editOk" />
    <Confirm-Delete
      v-if="app.showConfirm"
      :rec="select2delete"
      @confirm-ok="confirmOk"
    />
    <SwiperView
      v-if="app.showCarousel"
      :objects="objects"
      @carousel-cancel="useCarouselCancel"
    />

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
          @carousel-show="useCarouselShow(item.filename)"
          @edit-record="editRecord(item)"
          @merge-tags="mergeTags(item)"
          @confirm-delete="confirmShow(item)"
        />
      </swiper-slide>
    </swiper-container>
  </q-page>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  defineEmits,
  defineAsyncComponent,
} from "vue";
import { useAppStore } from "../stores/app";
import { useUserStore } from "../stores/user";
import { useValuesStore } from "../stores/values";
import { useRoute } from "vue-router";
import { U, fakeHistory } from "../helpers";
import { useCarouselShow, useCarouselCancel } from "../helpers/common";
import { register } from "swiper/element/bundle";
import { Keyboard, Zoom } from "swiper/modules";
import PictureCard from "src/components/Picture-Card.vue";
import SwiperView from "../components/Swiper-View.vue";

const EditRecord = defineAsyncComponent(() =>
  import("../components/Edit-Record.vue")
);
const ConfirmDelete = defineAsyncComponent(() =>
  import("../components/Confirm-Delete.vue")
);

const emit = defineEmits(["editOk"]);

const app = useAppStore();
const auth = useUserStore();
const meta = useValuesStore();
const objects = computed(() => app.objects);

const route = useRoute();
const select2delete = ref({});

onMounted(() => {
  const hash = route.hash;
  if (hash) {
    const filename = hash.substring(2);
    useCarouselShow(filename);
  }
});

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

const confirmShow = (rec) => {
  select2delete.value = rec;
  fakeHistory();
  app.showConfirm = true;
};
const confirmOk = (rec) => {
  app.showConfirm = false;
  app.deleteRecord(rec);
};
const editRecord = (rec) => {
  app.currentEdit = rec;
  fakeHistory();
  app.showEdit = true;
};
const editOk = (hash) => {
  const el = document.querySelector("#" + hash);
  if (!el) return;
  el.classList.add("bounce");
  setTimeout(() => {
    el.classList.remove("bounce");
  }, 2000);
};
</script>
