<template>
  <Edit-Record v-if="app.showEdit" :rec="app.current" @edit-ok="editOk" />
  <Confirm-Delete
    v-if="app.showConfirm"
    :rec="app.current"
    @confirm-ok="confirmOk"
  />

  <Transition>
    <KeepAlive>
      <component
        :is="currentView"
        :objects="app.objects"
        @carousel-show="useCarouselShow"
        @carousel-cancel="useCarouselCancel"
        @edit-record="editRecord"
        @confirm-delete="confirmShow"
        @edit-ok="editOk"
      ></component>
    </KeepAlive>
  </Transition>
</template>

<script setup>
import { shallowRef, onMounted, watch, defineAsyncComponent } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../stores/app";
import { useRoute } from "vue-router";
import { fakeHistory } from "../helpers";
import { useCarouselShow, useCarouselCancel } from "../helpers/common";

import SwiperView from "../components/Swiper-View.vue";
import ListView from "../components/List-View.vue";

const EditRecord = defineAsyncComponent(() =>
  import("../components/Edit-Record.vue")
);
const ConfirmDelete = defineAsyncComponent(() =>
  import("../components/Confirm-Delete.vue")
);

const app = useAppStore();
const route = useRoute();

const { showCarousel } = storeToRefs(app);
const currentView = shallowRef(ListView);

onMounted(() => {
  const hash = route.hash;
  if (hash) {
    const filename = hash.substring(2);
    currentView.value = SwiperView;
    app.marker = filename;
  }
});

watch(showCarousel, (show) => {
  if (show) {
    currentView.value = SwiperView;
  } else {
    currentView.value = ListView;
  }
});

const confirmShow = (rec) => {
  app.current = rec;
  fakeHistory();
  app.showConfirm = true;
};
const confirmOk = (rec) => {
  app.showConfirm = false;
  app.deleteRecord(rec);
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
</script>
