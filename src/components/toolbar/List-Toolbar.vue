<template>
  <div class="list-toolbar-wrapper">
    <div class="toolbar-top row items-stretch no-wrap">
      <div class="col toolbar-search">
        <Global-Search />
      </div>

      <div class="row items-center no-wrap q-px-sm">
        <q-btn v-if="user && user.isAuthorized" flat stretch @click="changeMode(editMode)">{{
          editMode ? 'Edit mode' : 'View mode'
        }}</q-btn>
        <span class="q-mx-md">{{ record.count }}</span>
      </div>
    </div>

    <div class="absolute-bottom">
      <q-linear-progress v-if="busy" color="warning" indeterminate />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useUserStore } from 'src/stores/user'
import GlobalSearch from 'src/components/Global-Search.vue'

const app = useAppStore()
const auth = useUserStore()
const { busy, record, editMode } = storeToRefs(app)
const { user } = storeToRefs(auth)

const changeMode = (mode: boolean) => {
  mode = !mode
  editMode.value = mode
}
</script>

<style scoped lang="scss">
.list-toolbar-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-top {
  width: 100%;
}

.toolbar-search {
  width: 100%;
}
</style>
