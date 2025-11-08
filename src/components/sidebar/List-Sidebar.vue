<template>
  <Find />
  <TagsMerge
    v-if="user?.isAdmin && editMode"
    class="q-px-md"
    :label="`Tags to merge with existing`"
  />
  <q-space />
  <Menu />
</template>

<script setup lang="ts">
import { useAppStore } from 'src/stores/app'
import { useUserStore } from 'src/stores/user'
import { storeToRefs } from 'pinia'
import Find from './Find.vue'
import Menu from './Menu.vue'
import TagsMerge from './Tags-Merge.vue'

const app = useAppStore()
const auth = useUserStore()

const { editMode } = storeToRefs(app)
const { user } = storeToRefs(auth)
</script>
