import type { Timestamp } from '@google-cloud/firestore'

export interface FindType {
  year?: number
  month?: number
  day?: number
  text?: string
  tags?: string[]
  model?: string
  lens?: string
  nick?: string
}
export interface BucketType {
  size: number
  count: number
}
export interface ExifType {
  date?: string
  day?: number
  month?: number
  year?: number

  model?: string
  lens?: string
  focal_length?: number
  aperture?: number
  shutter?: string
  iso?: number
  flash?: boolean
  dim?: [number, number]
  loc?: string
}
export interface PhotoType extends ExifType {
  readonly filename: string
  readonly url: string
  size: number
  email: string
  nick: string
  headline?: string
  tags?: string[]
  text?: string[]
  thumb?: string
}
export interface LastPhoto extends PhotoType {
  href: string
}
export interface CounterRecord {
  count: number
  field: 'year' | 'tags' | 'model' | 'lens' | 'nick'
  value: string
}
export interface MyUserType {
  readonly uid: string
  name: string
  email: string
  nick: string
  isAuthorized: boolean
  isAdmin: boolean
  allowPush: boolean
  timestamp: Timestamp
}
export interface DeviceType {
  key: string
  email: string
  timestamp: Timestamp
}
export interface UsersAndDevices extends MyUserType {
  timestamps: Timestamp[]
}
export interface ValuesState {
  headlineToApply: string
  tagsToApply: string[]
  values: {
    year: { [key: string]: number }
    tags: { [key: string]: number }
    model: { [key: string]: number }
    lens: { [key: string]: number }
    email: { [key: string]: number }
    nick: { [key: string]: number }
  }
}
export interface MessageType {
  key: string
  email: string
  message: string
  status: boolean
  text: string
  timestamp: Timestamp
}

export interface FileProgress {
  // {file.name: progress 0..1, ...}
  [key: string]: number
}

export interface AppStoreState {
  bucket: BucketType
  find: FindType | null
  uploaded: PhotoType[]
  objects: PhotoType[]
  next: string
  currentEdit: PhotoType
  lastRecord: PhotoType | null
  busy: boolean
  progressInfo: FileProgress
  error: string
  showEdit: boolean
  showConfirm: boolean
  showCarousel: boolean
  adminTab: string
  selected: PhotoType[]
}
