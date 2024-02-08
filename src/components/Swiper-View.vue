<template>
  <q-carousel
    fullscreen
    animated
    swipeable
    transition-prev="slide-right"
    transition-next="slide-left"
    v-model="starting"
    @update:model-value="changeSlide"
  >
    <!-- @dblclick="zoom" -->
    <q-carousel-slide
      v-for="obj in list"
      :key="obj.filename"
      :name="obj.filename"
      :img-src="obj.url"
      :data-url="obj.url"
    >
      <div
        v-show="!full"
        class="absolute-top row no-wrap justify-between q-pa-sm"
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
        <div class="col text-white text-center" style="user-select: none">
          <span class="text-h6 ellipsis">{{ obj.headline }}</span
          ><br />
          {{ caption(obj) }}
        </div>

        <q-btn
          flat
          round
          class="text-white q-pa-md"
          icon="close"
          @click="onCancel"
        />
      </div>
      <q-btn
        flat
        round
        class="absolute-bottom-right text-white q-mr-sm q-mb-sm q-pa-md"
        @click="$q.fullscreen.toggle()"
        :icon="full ? 'fullscreen_exit' : 'fullscreen'"
      />
    </q-carousel-slide>
  </q-carousel>
</template>

<script setup>
import { useQuasar } from "quasar";
import { ref, watch, onMounted } from "vue";
import { useUserStore } from "../stores/user";
import { useRoute } from "vue-router";
import { formatBytes, removeHash, U, getImageDimensions } from "../helpers";

const emit = defineEmits(["carouselCancel", "confirmDelete", "deleteRecord"]);
const props = defineProps({
  filename: String,
  list: Array,
});

const $q = useQuasar();
const starting = ref(props.filename);
const auth = useUserStore();
const route = useRoute();
const hash = ref(null);
const urlHash = new RegExp(/#(.*)?/); // matching string hash
const full = ref(false);

watch(
  () => $q.fullscreen.isActive,
  (val) => {
    full.value = val;
  }
);

onMounted(() => {
  changeSlide(props.filename);
});

const changeSlide = (name) => {
  let url = route.fullPath;
  hash.value = name;
  const sufix = "#" + U + hash.value;
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
    const { aperture, shutter, iso, model, lens } = rec;
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
};
const onCancel = () => {
  removeHash();
  emit("carouselCancel", hash.value);
};

// const zoom = async (evt) => {
//   const el = evt.target;
//   console.log(evt.screenX, evt.screenY);
//   const url = el.getAttribute("data-url");
//   const { width, height } = await getImageDimensions(url);

//   if (el.style.backgroundSize === "contain") {
//     el.style.backgroundSize = width + "px " + height + "px";
//   } else {
//     el.style.backgroundSize = "contain";
//   }
// };
</script>

<style scoped>
.q-carousel__slide {
  background-color: #000;
  background-size: contain;
  background-repeat: no-repeat;
}
</style>
