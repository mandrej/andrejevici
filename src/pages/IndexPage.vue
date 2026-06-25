<template>
  <q-img v-if="$q.screen.gt.sm" src="logo.svg" style="width: 25vw; height: 25vw" class="q-ma-md" />
  <q-btn
    :label="user ? `Hi ${user.name}` : 'Sign in'"
    color="primary"
    @click="auth.signIn"
    :flat="user !== null"
    rounded
    class="q-mb-md"
  />
  <div class="text-caption">Build {{ build }}</div>
  <div class="text-h4 text-weight-thin">
    {{ $route.meta.title }}
  </div>
  <div v-if="bucket.count > 0" class="text-body2">
    {{ bucket.count }} photos since {{ sinceYear }} and counting
  </div>

  <div class="text-center text-body2 q-mt-md q-gutter-sm">
    <q-btn
      v-for="[nick] in topNicks"
      :key="nick"
      :label="nick"
      rounded
      color="secondary"
      text-color="black"
      @click="app.searchBy({ nick })"
      to="/list"
    />
  </div>

  <div class="fixed-bottom-right q-pa-md z-max">
    <q-btn-toggle
      v-model="theme"
      flat
      dense
      rounded
      toggle-color="primary"
      color="grey-7"
      size="sm"
      padding="4px"
      :options="[
        { icon: 'sym_r_light_mode', value: 'light', slot: 'light' },
        { icon: 'sym_r_dark_mode', value: 'dark', slot: 'dark' },
        { icon: 'sym_r_brightness_6', value: 'auto', slot: 'auto' },
      ]"
    >
    </q-btn-toggle>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { build } from '../helpers'
import { useAppStore } from '../stores/app'
import { useUserStore } from '../stores/user'
import { useValuesStore } from '../stores/values'
import { useBucketStore } from '../stores/bucket'

const app = useAppStore()
const meta = useValuesStore()
const bucketStore = useBucketStore()
const auth = useUserStore()
const { user } = storeToRefs(auth)

/** Per-nick photo count map, sorted by count descending. */
const nickWithCount = computed(() => meta.nickWithCount)

/** The two highest-contributing nicknames, used for the quick-filter buttons. */
const topNicks = computed(() => Object.entries(nickWithCount.value).slice(0, 2))

/** The oldest year in the archive (last element of yearValues). */
const sinceYear = computed(() => meta.yearValues[meta.yearValues.length - 1])
const { bucket } = storeToRefs(bucketStore)
const { theme: appTheme } = storeToRefs(app)

/**
 * Two-way computed that proxies the app store's `theme` setting.
 * Reading returns the current theme; writing calls `app.setTheme` so that
 * the value is persisted and Quasar Dark mode is updated immediately.
 */
const theme = computed({
  /**
   * Gets the bound value.
   */
  get: () => appTheme.value,
  /**
   * Sets the bound value.
   *
   * @param val - The val value.
   */
  set: (val: 'light' | 'dark' | 'auto') => {
    app.setTheme(val)
  },
})
</script>
