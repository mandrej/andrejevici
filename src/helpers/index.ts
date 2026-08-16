import CONFIG from '@/config'
import { slugify } from 'transliteration'
import type { FindType, MyUserType, PhotoType } from '@/helpers/models'
import { Timestamp } from 'firebase/firestore'

/**
 * Format bytes as human-readable size string (e.g. "1.2 MB").
 */
const formatBytesNative = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i]
}

export type DateInput =
  | Date
  | number
  | string
  | { toDate?: () => Date; seconds?: number; toMillis?: () => number }
  | null
  | undefined

export interface DateFields {
  date: Timestamp
  year: number
  month: number
  day: number
}

/**
 * Safely parses any date input (Date object, timestamp number, ISO string, or Firestore Timestamp) into a Date.
 * Returns a fallback Date (defaults to current date) if input is invalid or missing.
 */
export const parseDate = (val?: DateInput, fallback: Date = new Date()): Date => {
  if (val === null || val === undefined || val === '') return fallback
  if (val instanceof Date) return isNaN(val.getTime()) ? fallback : val

  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      const d = val.toDate()
      return isNaN(d.getTime()) ? fallback : d
    }
    if (typeof val.toMillis === 'function') {
      const d = new Date(val.toMillis())
      return isNaN(d.getTime()) ? fallback : d
    }
    if (typeof val.seconds === 'number') {
      const d = new Date(val.seconds * 1000)
      return isNaN(d.getTime()) ? fallback : d
    }
  }

  if (typeof val === 'number') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? fallback : d
  }

  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return fallback
    if (/^\d+$/.test(trimmed)) {
      const d = new Date(Number(trimmed))
      if (!isNaN(d.getTime())) return d
    }
    const sanitized = trimmed.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    const d = new Date(sanitized)
    if (!isNaN(d.getTime())) return d
    const parsed = Date.parse(sanitized)
    if (!isNaN(parsed)) return new Date(parsed)
  }

  return fallback
}

/**
 * Format a date using the given token-based format string.
 * Supports: YYYY MM DD HH mm ss
 */
export const formatDateNative = (d: Date, fmt: string): string => {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return fmt
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()))
}

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
export const formatBytes = (bytes: number): string => formatBytesNative(bytes)

/**
 * Formats a date value using the application's configured date format.
 *
 * @param str - The date to format; accepts a `Date` object, Unix timestamp, ISO string, or Firestore Timestamp.
 * @param format - Format string. Defaults to `CONFIG.dateFormat`.
 * @returns The formatted date string.
 */
export const formatDatum = (str?: DateInput, format: string = CONFIG.dateFormat): string => {
  const d = parseDate(str)
  return formatDateNative(d, format)
}

/**
 * Extracts formatted date string and component numbers (year, month 1-12, day 1-31).
 *
 * @param str - Date input value.
 * @param format - Format string for the date property. Defaults to `CONFIG.dateFormat`.
 * @returns Object containing `date`, `year`, `month`, and `day`.
 */
export const getDateFields = (str?: DateInput): DateFields => {
  const d = parseDate(str)
  return {
    date: Timestamp.fromDate(d),
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  }
}

/**
 * Formats a date input into an HTML5 `<input type="datetime-local">` compatible string (`YYYY-MM-DDTHH:mm`).
 *
 * @param str - Date input value.
 * @returns ISO-like local datetime string (`YYYY-MM-DDTHH:mm`).
 */
export const toDateTimeLocalString = (str?: DateInput): string => {
  return formatDatum(str, 'YYYY-MM-DDTHH:mm')
}

/**
 * Calculates the elapsed age in days from a date/timestamp to current time.
 *
 * @param timestamp - Date or Firestore Timestamp input.
 * @returns Elapsed age in integer days.
 */
export const getAgeDays = (timestamp?: DateInput): number => {
  if (!timestamp) return 0
  const d = parseDate(timestamp)
  const diff = Date.now() - d.getTime()
  return Math.max(0, Math.floor(diff / 86400000))
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

export const build = process.env.NEXT_PUBLIC_BUILD || ''
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
  const idx = arr.findIndex((it) => it.id === obj.id)
  if (idx > -1) arr.splice(idx, 1)
}

/**
 * Replaces the first occurrence of a record in `arr` whose `id` matches
 * `obj.id` with `obj`.
 *
 * @param arr - The array to mutate.
 * @param obj - The new photo record to insert in place of the matching entry.
 */
export const replaceInList = (arr: PhotoType[], obj: PhotoType): void => {
  const idx = arr.findIndex((it) => it.id === obj.id)
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

export const delimiter = '||' // for counter id
export const reFilename = /^(.*?)(\.[^.]*)?$/

/**
 * Extracts a default nickname from an email address.
 *
 * @param email - The email address.
 * @returns The part of the email before the '@' symbol.
 */
export const dummy = (email: string | undefined | null): string => {
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

/**
 * Fetches YouTube video title and description by video ID using YouTube's official oEmbed API.
 *
 * @param params - Object containing the YouTube video ID and optional language code.
 * @returns Promise resolving to an object with `data: { title, description }`.
 */
export const fetchYouTubeTitle = async ({
  videoID,
}: {
  videoID: string
  lang?: string
}): Promise<{ data: { title: string; description: string } }> => {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoID)}&format=json`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube title: ${res.statusText}`)
  }
  const data = (await res.json()) as { title?: string; author_name?: string }
  return {
    data: {
      title: data.title || '',
      description: data.author_name ? `By ${data.author_name}` : '',
    },
  }
}

/**
 * Validates an email address against a standard format pattern.
 *
 * @param val - The email address string to validate.
 * @returns `true` if valid, or `'Invalid email'` error message string if invalid.
 */
export const isValidEmail = (val: string): true | string => {
  const emailPattern =
    /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/
  return emailPattern.test(val) || 'Invalid email'
}
