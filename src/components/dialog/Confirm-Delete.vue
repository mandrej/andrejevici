<template>
  <SmallDialog
    :trigger="showConfirm"
    title="Confirm Delete"
    :message="`Would you like to delete ${formatBytes(rec!.size)} photo named '${rec!.headline}'?`"
  >
    <template #action>
      <q-btn color="primary" label="OK" @click="emit('confirm-ok', rec)" />
      <q-btn flat label="Close" @click="onCancel" />
    </template>
  </SmallDialog>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { formatBytes } from 'src/helpers'
import SmallDialog from 'src/layouts/Small-Dialog.vue'

const emit = defineEmits(['confirm-ok'])
defineProps({
  rec: Object,
})

const app = useAppStore()
const { showConfirm } = storeToRefs(app)

window.onpopstate = function () {
  showConfirm.value = false
}
const onCancel = () => {
  showConfirm.value = false
}
</script>
