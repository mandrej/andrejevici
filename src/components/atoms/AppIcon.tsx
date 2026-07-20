import React from 'react'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowUpTrayIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  Bars3Icon,
  BellAlertIcon,
  BellIcon,
  CameraIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
  PencilSquareIcon,
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
} from '@heroicons/react/24/outline'

import { PlayIcon as SolidPlayIcon } from '@heroicons/react/24/solid'

interface AppIconProps extends React.SVGProps<SVGSVGElement> {
  name: string
}

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  // Generic actions
  add: PlusIcon,
  check: CheckIcon,
  close: XMarkIcon,
  delete: TrashIcon,
  edit: PencilSquareIcon,
  build: WrenchIcon,
  search: MagnifyingGlassIcon,

  // Navigation & UI
  menu: Bars3Icon,
  arrow_upward: ArrowUpIcon,
  clear_all: XCircleIcon,
  unfold_more: ChevronUpDownIcon,
  chevron_left: ChevronLeftIcon,
  chevron_right: ChevronRightIcon,

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
  fullscreen_exit: ArrowsPointingInIcon,

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

export const AppIcon: React.FC<AppIconProps> = ({ name, ...props }) => {
  const IconComponent = iconMap[name] ?? ExclamationCircleIcon
  return <IconComponent className="inline-block" {...props} />
}

export default AppIcon
