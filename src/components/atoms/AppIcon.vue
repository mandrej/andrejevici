<template>
  <component :is="resolved" class="inline-block" v-bind="$attrs" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FunctionalComponent, SVGAttributes } from 'vue'

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowUpTrayIcon,
  ArrowsPointingOutIcon,
  Bars3Icon,
  BellAlertIcon,
  BellIcon,
  CameraIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronUpDownIcon,
  CircleStackIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  DocumentDuplicateIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  FilmIcon,
  HomeIcon,
  InformationCircleIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PencilIcon,
  PhotoIcon,
  PlusIcon,
  RectangleStackIcon,
  ShareIcon,
  Squares2X2Icon,
  SunIcon,
  TableCellsIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
  WrenchIcon,
  WrenchScrewdriverIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

import { PlayIcon as SolidPlayIcon } from '@heroicons/vue/24/solid'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ name: string }>()

type IconComponent = FunctionalComponent<SVGAttributes>

const iconMap: Record<string, IconComponent> = {
  // Generic actions
  add: PlusIcon,
  check: CheckIcon,
  close: XMarkIcon,
  delete: TrashIcon,
  edit: PencilIcon,
  build: WrenchIcon,
  search: MagnifyingGlassIcon,

  // Navigation & UI
  menu: Bars3Icon,
  arrow_upward: ArrowUpIcon,
  clear_all: XCircleIcon,
  unfold_more: ChevronUpDownIcon,

  // Files & media
  cloud_upload: CloudArrowUpIcon,
  upload: CloudArrowUpIcon,
  download: ArrowDownTrayIcon,
  publish: ArrowUpTrayIcon,
  content_copy: DocumentDuplicateIcon,
  content_paste: ClipboardDocumentIcon,
  play_circle: SolidPlayIcon,
  image: PhotoIcon,
  broken_image: PhotoIcon,
  video_library: FilmIcon,

  // Maps & location
  my_location: MapPinIcon,

  // Status / feedback
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
  check_circle: CheckCircleIcon,
  info: InformationCircleIcon,
  hourglass_empty: ClockIcon,
  priority_high: ExclamationCircleIcon,

  // Notifications
  notifications: BellIcon,
  add_alert: BellAlertIcon,

  // Share & fullscreen
  share: ShareIcon,
  fullscreen: ArrowsPointingOutIcon,

  // Admin / settings
  construction: WrenchScrewdriverIcon,
  storage: CircleStackIcon,
  schema: TableCellsIcon,
  aspect_ratio: RectangleStackIcon,
  image_not_supported: PhotoIcon,
  sync_problem: ArrowPathIcon,

  // Navigation links (sym_r_ prefixed)
  sym_r_home: HomeIcon,
  sym_r_grid_view: Squares2X2Icon,
  sym_r_add_a_photo: CameraIcon,
  sym_r_settings: Cog6ToothIcon,
  sym_r_person: UserIcon,
  sym_r_error_outline: ExclamationCircleIcon,
  sym_r_category: TagIcon,
  sym_r_label: TagIcon,
  sym_r_photo_camera: CameraIcon,
  sym_r_camera: CameraIcon,
  sym_r_check: CheckIcon,
  sym_r_edit: PencilIcon,
  sym_r_delete: TrashIcon,
  sym_r_close: XMarkIcon,

  // Theme toggle
  light_mode: SunIcon,
  dark_mode: MoonIcon,
  brightness_6: ComputerDesktopIcon,

  // People / social
  group: UsersIcon,
  chat: ChatBubbleLeftRightIcon,
}

const resolved = computed<IconComponent>(
  () => iconMap[props.name] ?? ExclamationCircleIcon,
)
</script>
