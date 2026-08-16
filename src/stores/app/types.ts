import type {
  FindType,
  PhotoType,
  VideoType,
  AssetKind,
  ValuesState,
  FileProgress,
} from '@/helpers/models'

export interface UiSliceState {
  busy: boolean
  error: string
  showEdit: boolean
  showConfirm: boolean
  showCarousel: boolean
  adminTab: string
  addTab: AssetKind
  metaTab: keyof ValuesState['values']
  theme: 'light' | 'dark' | 'auto'
  progressInfo: FileProgress
}

export interface UiSliceActions {
  setBusy: (busy: boolean) => void
  setError: (error: string) => void
  setShowEdit: (showEdit: boolean) => void
  setShowConfirm: (showConfirm: boolean) => void
  setShowCarousel: (showCarousel: boolean) => void
  setAdminTab: (tab: string) => void
  setAddTab: (tab: AssetKind) => void
  setMetaTab: (tab: keyof ValuesState['values']) => void
  setProgressInfo: (info: FileProgress) => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  initTheme: () => void
}

export interface RecordsSliceState {
  find: FindType | null
  objects: PhotoType[]
  next: string
  selected: PhotoType[]
}

export interface RecordsSliceActions {
  searchBy: (criteria: FindType, onNavigate?: () => void) => void
  fetchPhoto: (id: string) => Promise<PhotoType | null>
  fetchRecords: (
    reset?: boolean,
  ) => Promise<{ objects: PhotoType[]; error: string | null; next: string | null } | void>
  setSelected: (selected: PhotoType[] | ((prev: PhotoType[]) => PhotoType[])) => void
}

export interface PhotoOpsSliceState {
  uploaded: PhotoType[]
  currentEdit: PhotoType
  lastRecord: PhotoType | null
}

export interface PhotoOpsSliceActions {
  completePhoto: (rec: PhotoType, tags: string[], headline: string) => Promise<PhotoType>
  saveRecord: (obj: PhotoType) => Promise<PhotoType>
  saveVideo: (obj: VideoType) => Promise<VideoType>
  deleteRecord: (obj: PhotoType) => Promise<void>
  subscribeLastRec: () => () => void
  setCurrentEdit: (edit: PhotoType) => void
  setUploaded: (uploaded: PhotoType[] | ((prev: PhotoType[]) => PhotoType[])) => void
}

export type AppStore = UiSliceState &
  UiSliceActions &
  RecordsSliceState &
  RecordsSliceActions &
  PhotoOpsSliceState &
  PhotoOpsSliceActions
