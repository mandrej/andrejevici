<template>
  <!-- Headless UI TabGroup — replaces q-tabs / q-tab-panels pattern -->
  <TabGroup
    :selected-index="selectedIndex"
    @change="onTabChange"
    :vertical="vertical"
  >
    <slot :TabList="TabList" :Tab="Tab" :TabPanels="TabPanels" :TabPanel="TabPanel" />
  </TabGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue'

const props = defineProps<{
  modelValue: string
  tabs: Array<{ name: string; label?: string; icon?: string }>
  vertical?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const selectedIndex = computed(() => props.tabs.findIndex((t) => t.name === props.modelValue))

const onTabChange = (index: number) => {
  emit('update:modelValue', props.tabs[index]?.name ?? props.tabs[0].name)
}
</script>
