import CONFIG from '../config'
import { date, format } from 'quasar'
import readExif from './exif'
import { slugify } from 'transliteration'
import type { FindType, MyUserType, PhotoType } from './models'

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
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const formatBytes = (bytes: number): string => humanStorageSize(bytes)
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

export const build = process.env.ANDREJEVICI_BUILD || ''
export const isEmpty = (obj: object): boolean => Object.keys(obj).length === 0

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
export const reFilename = /^(.*?)(\.[^.]*)?$/

export const thumbName = (filename: string) => {
  const match = filename.match(reFilename)
  if (!match) return ''
  const [, name] = match
  return [CONFIG.thumbnails, name + CONFIG.thumbSuffix].join('/')
}
export const thumbUrl = (filename: string) => {
  return [
    'https://storage.googleapis.com',
    CONFIG.firebase.storageBucket,
    thumbName(filename),
  ].join('/')
}

export const counterId = (field: string, value: string | number): string => {
  // IDs cannot contain a forward slash (/)
  return `${field}${delimiter}${value}`.replace(/\//g, '%2F')
}

export const isAuthorOrAdmin = (
  user: MyUserType | null | undefined, // Allow undefined for store refs that might be undefined
  rec: PhotoType,
): boolean => {
  return Boolean(user && (user.isAdmin || user.email === rec.email))
}

export const completePhoto = async (
  rec: PhotoType,
  tags: string[],
  headline: string,
): Promise<PhotoType> => {
  // url, filename, size, email, nick exist from uploadTask
  const datum = new Date()
  const exif = await readExif(rec.url)

  const tmp: PhotoType = {
    ...rec,
    kind: 'photo',
    date: formatDatum(datum, CONFIG.dateFormat),
    year: datum.getFullYear(),
    month: datum.getMonth() + 1,
    day: datum.getDate(),
    headline,
    text: sliceSlug(headline),
    tags,
    ...exif,
  }

  // Sync 'flash' tag with EXIF data
  const updatedTags = new Set(tmp.tags)
  if (tmp.flash) {
    updatedTags.add('flash')
  } else {
    updatedTags.delete('flash')
  }
  tmp.tags = [...updatedTags]
  return tmp
}

/**
 * Sanitizes and normalizes the search query criteria.
 * @param query The search query criteria to fix.
 * @returns The sanitized and normalized search query criteria.
 */
const dateFields = new Set(['year', 'month', 'day'])
export const fixQuery = (query: FindType): FindType => {
  const sanitizedQuery = Object.fromEntries(
    Object.entries(query)
      .filter(
        ([, value]) =>
          value !== null && value !== '' && (Array.isArray(value) ? value.length > 0 : true),
      )
      .map(([key, value]) => {
        if (dateFields.has(key)) {
          return [key, Number(value)]
        } else if (key === 'tags' && typeof value === 'string') {
          return [key, [value]]
        }
        return [key, value]
      }),
  )
  return sanitizedQuery as FindType
}
export const openMaps = (loc: string) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${loc}`
  window.open(url, '_blank')
}

export const getYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2] && match[2].length === 11 ? match[2] : null
}

export const getYouTubeMaxResUrl = (url: string): string | null => {
  const id = getYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null
}
