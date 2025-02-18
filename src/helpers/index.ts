import CONFIG from '../../config'
import { date, format } from 'quasar'
import { slugify } from 'transliteration'
import { computed } from 'vue'

const { humanStorageSize } = format
const { formatDate } = date

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const formatBytes = (bytes: number): string => {
  return humanStorageSize(bytes)
}
const formatDatum = (str: Date | number | string, format: string = CONFIG.dateFormat): string => {
  const date = new Date(str)
  return formatDate(date, format)
}
const emailNick = (email: string): string => {
  const match = email.match(/[^.@]+/)
  return match ? match[0] : ''
}
const fakeHistory = () => {
  window.history.pushState(history.state, '', history.state.current)
}
const removeHash = () => {
  window.history.replaceState(history.state, '', history.state.current.replace(/#(.*)?/, ''))
}
const version = computed(() => {
  const ver = process.env.ANDREJEVICI_VERSION?.match(/.{1,4}/g)?.join('.') || ''
  return 'ver. ' + ver
})
const removeByFilename = <T extends { filename: string }>(arr: T[], value: string): void => {
  const idx = arr.findIndex((it) => it.filename === value)
  if (idx > -1) arr.splice(idx, 1)
}
const changeByFilename = <T extends { filename: string }>(arr: T[], obj: T, op = 1): void => {
  const idx = arr.findIndex((it) => it.filename === obj.filename)
  if (idx >= 0) {
    arr.splice(idx, op, obj)
  }
}
const textSlug = (text: string): string => {
  // return slugify(text, { replace: [[/[\.|\:|-]/g, ""]] });
  return slugify(text, {
    replace: [
      ['ш', 's'],
      ['đ', 'dj'],
      ['џ', 'dz'],
      ['ћ', 'c'],
      ['ч', 'c'],
      ['ж', 'z'],
      [/[.-::^[0-9]]+/g, ''],
    ],
  })
}
const sliceSlug = (slug: string): string[] => {
  const text = []
  for (const word of slug.split('-')) {
    for (let j = 3; j < word.length + 1; j++) {
      const part = word.slice(0, j)
      if (part.length > 8) break
      text.push(part)
    }
  }
  return text
}

export const U = '_'
export const fileBroken = CONFIG.fileBroken
export const reFilename = new RegExp(/^(.*?)(\.[^.]*)?$/)
export const thumbName = (filename: string) => {
  const match = filename.match(reFilename)
  if (!match) return ''
  const [, name] = match
  return [CONFIG.thumbnails, name + '_400x400.jpeg'].join('/')
}
export const thumbUrl = (filename: string) => {
  return [
    'https://storage.googleapis.com',
    CONFIG.firebase.storageBucket,
    thumbName(filename),
  ].join('/')
}
export {
  CONFIG,
  months,
  formatBytes,
  formatDatum,
  emailNick,
  fakeHistory,
  removeHash,
  version,
  removeByFilename,
  changeByFilename,
  textSlug,
  sliceSlug,
}
