import CONFIG from '../../config'
import { date, format } from 'quasar'
import readExif from './exif'
import { slugify } from 'transliteration'
import { computed } from 'vue'
import type { PhotoType } from '../helpers/models'

const { humanStorageSize } = format
const { formatDate } = date

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const formatBytes = (bytes: number): string => {
  return humanStorageSize(bytes)
}

/**
 * Formats a date string, number, or Date object into a specified format.
 *
 * @param {Date | number | string} str - The date to be formatted. Can be a Date object, a numeric timestamp, or a string representation of a date.
 * @param {string} [format='YYYY-MM-DD'] - The format to be used for the output. Defaults to the value of `CONFIG.dateFormat`.
 * @return {string} The formatted date.
 */
const formatDatum = (str: Date | number | string, format: string = CONFIG.dateFormat): string => {
  const date = new Date(str)
  return formatDate(date, format)
}
/**
 * Fakes a new history state by pushing the current state onto the history stack.
 *
 * This function is useful for testing or when you want to simulate a page refresh
 * without actually refreshing the page.
 */
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

/**
 * Removes a PhotoType object from an array by matching the filename property.
 *
 * @param {PhotoType[]} arr - The array to search for the filename.
 * @param {string} value - The filename to match and remove.
 * @return {void} This function does not return anything.
 */
const removeByFilename = (arr: PhotoType[], value: string): void => {
  const idx = arr.findIndex((it) => it.filename === value)
  if (idx > -1) arr.splice(idx, 1)
}
/**
 * Updates an array of PhotoType objects with a new object by matching the filename property.
 * If the filename is found in the array, the function splices the array at that index and
 * replaces it with the new object.
 *
 * @param {PhotoType[]} arr - The array to search for the filename.
 * @param {PhotoType} obj - The new object to replace the existing object in the array.
 * @param {number} [op=1] - The number of times to replace the existing object with the new object. Defaults to 1.
 */
const changeByFilename = (arr: PhotoType[], obj: PhotoType, op = 1): void => {
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

const completePhoto = async (
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
  tmp.text = sliceSlug(textSlug(headline))
  tmp.tags = tags

  const exif = await readExif(rec.url)
  tmp = { ...tmp, ...exif }
  return tmp
}
export {
  CONFIG,
  months,
  formatBytes,
  formatDatum,
  fakeHistory,
  removeHash,
  version,
  removeByFilename,
  changeByFilename,
  textSlug,
  sliceSlug,
  completePhoto,
}
