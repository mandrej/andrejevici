<template>
  <Edit-Record v-if="app.showEdit" :rec="app.current" @edit-ok="editOk" />
  <Confirm-Delete
    v-if="app.showConfirm"
    :rec="app.current"
    @confirm-ok="confirmOk"
  />
  <Swiper-View
    v-if="app.showCarousel"
    :filename="currentFileName"
    :list="app.objects"
    @carousel-cancel="carouselCancel"
    @confirm-delete="confirmShow"
    @delete-record="app.deleteRecord"
  />

  <q-page v-else>
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

    <q-scroll-observer
      @scroll="scrollHandler"
      axis="vertical"
      :debounce="500"
    />

    <div class="q-pa-md">
      <div
        v-for="(list, index) in app.groupObjects"
        :key="index"
        class="q-mb-md"
      >
        <transition-group tag="div" class="row q-col-gutter-md" name="fade">
          <div
            v-for="item in list"
            :key="item.filename"
            class="col-xs-12 col-sm-6 col-md-4 col-lg-3 col-xl-2"
          >
            <Picture-Card
              :rec="item"
              :canManage="isAuthorOrAdmin(item)"
              @carousel-show="carouselShow"
              @edit-record="editRecord"
              @confirm-delete="confirmShow"
              @delete-record="app.deleteRecord"
            />
          </div>
        </transition-group>
      </div>
    </div>

    <q-page-scroller
      position="bottom-right"
      :scroll-offset="150"
      :offset="[18, 18]"
    >
      <q-btn fab icon="arrow_upward" color="warning" />
    </q-page-scroller>
  </q-page>
</template>

<script setup>
import { scroll, throttle } from "quasar";
import { defineAsyncComponent, onMounted, ref } from "vue";
import { useAppStore } from "../stores/app";
import { useUserStore } from "../stores/user";
import { useRoute } from "vue-router";
import { fakeHistory } from "../helpers";

import PictureCard from "../components/Picture-Card.vue";
import SwiperView from "../components/Swiper-View.vue";

const EditRecord = defineAsyncComponent(() =>
  import("../components/Edit-Record.vue")
);
const ConfirmDelete = defineAsyncComponent(() =>
  import("../components/Confirm-Delete.vue")
);

const { getScrollTarget, setVerticalScrollPosition } = scroll;

const app = useAppStore();
const auth = useUserStore();
const route = useRoute();
const currentFileName = ref(null);

onMounted(() => {
  const hash = route.hash;
  if (hash) {
    const filename = hash.substring(2);
    setTimeout(() => {
      carouselShow(filename);
    }, 1000);
  }
});

const scrollHandler = throttle((obj) => {
  // trottle until busy: true
  const scrollHeight = document.documentElement.scrollHeight;
  if (
    scrollHeight - obj.position.top < 2000 &&
    obj.direction === "down" &&
    app.next
  ) {
    app.fetchRecords(false, "scroll");
  }
}, 100);

const isAuthorOrAdmin = (rec) => {
  return auth.user.isAdmin || auth.user.email === rec.email;
};

const editRecord = (rec) => {
  app.current = rec;
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
const confirmShow = (rec) => {
  app.current = rec;
  fakeHistory();
  app.showConfirm = true;
};
const confirmOk = (rec) => {
  app.showConfirm = false;
  app.deleteRecord(rec);
};
const carouselShow = (filename) => {
  currentFileName.value = filename;
  fakeHistory();
  app.showCarousel = true;
};
const carouselCancel = (hash) => {
  const el = document.querySelector("#" + hash);
  if (!el) return;
  const target = getScrollTarget(el);
  setVerticalScrollPosition(target, el.offsetTop, 500);
};
</script>
