import CONFIG from '../config'
import { date, format } from 'quasar'
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

/**
 * Formats a byte count into a human-readable storage size string (e.g. "1.2 MB").
 *
 * @param bytes - The byte count to format.
 * @returns A formatted string representation of the storage size.
 */
export const formatBytes = (bytes: number): string => humanStorageSize(bytes)

/**
 * Formats a date value using the application's configured date format.
 *
 * @param str - The date to format; accepts a `Date` object, a Unix timestamp, or an ISO string.
 * @param format - Optional Quasar date format string. Defaults to `CONFIG.dateFormat`.
 * @returns The formatted date string.
 */
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
/**
 * Returns `true` if the given object has no own enumerable properties.
 *
 * @param obj - The object to check.
 */
export const isEmpty = (obj: object): boolean => Object.keys(obj).length === 0

/**
 * Removes the first occurrence of `obj` from `arr`, matched by `filename`.
 *
 * @param arr - The array to mutate.
 * @param obj - The photo record whose matching entry should be removed.
 */
export const removeFromList = (arr: PhotoType[], obj: PhotoType): void => {
  const idx = arr.findIndex((it) => it.filename === obj.filename)
  if (idx > -1) arr.splice(idx, 1)
}

/**
 * Replaces the first occurrence of a record in `arr` whose `filename` matches
 * `obj.filename` with `obj`.
 *
 * @param arr - The array to mutate.
 * @param obj - The new photo record to insert in place of the matching entry.
 */
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

/**
 * Extracts a default nickname from an email address.
 *
 * @param email - The email address.
 * @returns The part of the email before the '@' symbol.
 */
export const getNickFromEmail = (email: string | undefined | null): string => {
  return (email || '').split('@')[0] || ''
}

/**
 * Returns the Storage path for the thumbnail of a given original filename.
 * The thumbnail lives under `CONFIG.thumbnails/<name>_400x400.jpeg`.
 *
 * @param filename - The original file's Storage filename (with extension).
 * @returns The thumbnail Storage path, or an empty string if the filename is invalid.
 */
export const thumbName = (filename: string) => {
  const match = filename.match(reFilename)
  if (!match) return ''
  const [, name] = match
  return [CONFIG.thumbnails, name + CONFIG.thumbSuffix].join('/')
}

/**
 * Returns the full public HTTPS URL for the thumbnail of a given original filename.
 *
 * @param filename - The original file's Storage filename (with extension).
 * @returns A `storage.googleapis.com` URL pointing to the thumbnail object.
 */
export const thumbUrl = (filename: string) => {
  return [
    'https://storage.googleapis.com',
    CONFIG.firebase.storageBucket,
    thumbName(filename),
  ].join('/')
}

/**
 * Generates a Firestore-safe counter document ID from a field name and its value.
 * Forward slashes are percent-encoded because Firestore IDs cannot contain `/`.
 *
 * @param field - The metadata field name (e.g. `'tags'`, `'model'`).
 * @param value - The field value to encode.
 * @returns The composite counter document ID string.
 */
export const counterId = (field: string, value: string | number): string => {
  // IDs cannot contain a forward slash (/)
  return `${field}${delimiter}${value}`.replace(/\//g, '%2F')
}

/**
 * Returns `true` if the given user is either an admin or the uploader of `rec`.
 *
 * @param user - The currently authenticated user, or `null`/`undefined` when not signed in.
 * @param rec - The photo record to check ownership against.
 * @returns `true` when the user may edit or delete the record.
 */
export const isAuthorOrAdmin = (
  user: MyUserType | null | undefined, // Allow undefined for store refs that might be undefined
  rec: PhotoType,
): boolean => {
  return Boolean(user && (user.isAdmin || user.email === rec.email))
}

/**
 * Sanitizes and normalizes the search query criteria.
 * @param query The search query criteria to fix.
 * @returns The sanitized and normalized search query criteria.
 */
const dateFields = new Set(['year', 'month', 'day'])
/**
 * Handles fix query.
 *
 * @param query - The query value.
 * @returns The function result.
 */
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
  return sanitizedQuery
}
/**
 * Opens a Google Maps search for the given GPS coordinate string in a new tab.
 *
 * @param loc - A coordinate string in `"latitude, longitude"` format.
 */
export const openMaps = (loc: string) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${loc}`
  window.open(url, '_blank')
}

/**
 * Extracts the 11-character YouTube video ID from a variety of YouTube URL formats,
 * including standard watch links, shortened `youtu.be` links, embeds, and Shorts.
 *
 * @param url - A full YouTube URL.
 * @returns The 11-character video ID, or `null` if the URL is not a recognised YouTube format.
 */
export const getYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2] && match[2].length === 11 ? match[2] : null
}

/**
 * Returns the maximum-resolution thumbnail URL for a YouTube video.
 *
 * @param url - A full YouTube URL.
 * @returns A `maxresdefault.jpg` thumbnail URL, or `null` if the URL is not a valid YouTube link.
 */
export const getYouTubeMaxResUrl = (url: string): string | null => {
  const id = getYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null
}
