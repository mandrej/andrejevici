import CONFIG from '../../config'
import { date, format } from 'quasar'
import readExif from './exif'
import { slugify } from 'transliteration'
import { computed } from 'vue'
import type { MyUserType, PhotoType } from 'src/helpers/models'

const { humanStorageSize } = format
const { formatDate } = date
const modifiers = {
  replace: {
    ш: 's',
    đ: 'dj',
    џ: 'dz',
    ћ: 'c',
    ч: 'c',
    ж: 'z',
    š: 's',
    dj: 'dj',
    dž: 'dz',
    ć: 'c',
    č: 'c',
    ž: 'z',
  },
}

export const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const formatBytes = (bytes: number): string => {
  return humanStorageSize(bytes)
}
export const formatDatum = (
  str: Date | number | string,
  format: string = CONFIG.dateFormat,
): string => {
  const date = new Date(str)
  return formatDate(date, format)
}
/**
 * Creates a fake history entry.
 *
 * @return {void} This function does not return anything.
 */
export const fakeHistory = () => {
  if (typeof window === 'undefined' || !window.history) return
  window.history.pushState(history.state, '', history.state.current)
}

export const version = computed(() => {
  const ver = process.env.ANDREJEVICI_VERSION?.match(/.{1,4}/g)?.join('.') || ''
  return 'ver. ' + ver
})
export const isEmpty = (obj: object) => {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false
    }
  }
  return true
}

export const removeFromList = (arr: PhotoType[], obj: PhotoType): void => {
  const idx = arr.findIndex((it) => it.filename === obj.filename)
  if (idx > -1) arr.splice(idx, 1)
}
export const replaceInList = (arr: PhotoType[], obj: PhotoType): void => {
  const idx = arr.findIndex((it) => it.filename === obj.filename)
  if (idx > -1) arr.splice(idx, 1, obj)
}
/**
 * Slices a slug into an array of strings.
 *
 * @param {string} text - The text to be sliced.
 * @return {string[]} An array of strings.
 */
export const sliceSlug = (text: string): string[] => {
  const slug = slugify(text, modifiers)
  const result: string[] = []
  for (const word of slug.split('-')) {
    for (let j = 3; j < word.length + 1; j++) {
      const part = word.slice(0, j)
      if (part.length > 8) break
      result.push(part)
    }
  }
  return result
}

export const U = '_'
export const delimiter = '||' // for counter id
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

export const counterId = (field: string, value: string): string => {
  return `Photo${delimiter}${field}${delimiter}${value}` // FIXME Photo is hard coded
}

export const isAuthorOrAdmin = (
  user: MyUserType | null | undefined, // Allow undefined for store refs that might be undefined
  rec: PhotoType,
  editMode: boolean,
): boolean => {
  return Boolean(user && (user.isAdmin || user.email === rec.email) && editMode)
}

export const completePhoto = async (
  rec: PhotoType,
  tags: string[],
  headline: string,
): Promise<PhotoType> => {
  let tmp = { ...rec }
  // url, filename, size, email, nick exist from uploadTask
  const datum = new Date()
  tmp.date = formatDatum(datum, CONFIG.dateFormat)
  tmp.year = datum.getFullYear()
  tmp.month = datum.getMonth() + 1
  tmp.day = datum.getDate()
  tmp.headline = headline
  tmp.text = sliceSlug(headline)
  tmp.tags = tags

  const exif = await readExif(rec.url)
  tmp = { ...tmp, ...exif }
  if (tmp.flash && tags.indexOf('flash') === -1) {
    tags.push('flash')
  }
  return tmp
}
export { CONFIG }
