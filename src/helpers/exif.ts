import exifReader from 'exifreader'
import { getDateFields } from '@/helpers/index'
import type { ExifType } from '@/helpers/models'
import CONFIG from 'src/config'
import { getDoc, doc, Timestamp } from 'firebase/firestore'
import { renameCollection } from '@/helpers/collections'

/** Regex to convert EXIF date format (YYYY:MM:DD) to ISO (YYYY-MM-DD) */
const rexDate = /(\d{4}):(\d{2}):(\d{2})/i

/**
 * Looks up a value in the Rename collection and returns the renamed value if found.
 * @param value - The original value to look up.
 * @returns The renamed value, or the original if no rename exists.
 */
const resolveRename = async (value: string): Promise<string> => {
  const safeId = value.replace(/\//g, '%2F')
  try {
    const snap = await getDoc(doc(renameCollection(), safeId))
    return snap.exists() ? snap.data().newValue : value
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.warn('Failed to query Rename collection', e)
    return value
  }
}

/**
 * Reads the EXIF data from a file.
 *
 * Accepts a `File` (preferred — parsed locally, no network) or a URL/path string.
 * Passing the local `File` avoids re-downloading the whole image just to read the
 * EXIF tags, which live in the first few kilobytes.
 *
 * @param {string | File} source - The file or the URL/path of the file to read.
 * @return {Promise<ExifType | null>} A promise that resolves to an object containing the EXIF data, or null if the file does not contain EXIF data.
 */
const readExif = async (source: string | File): Promise<ExifType | null> => {
  const result: ExifType = { model: CONFIG.unknownModel, date: Timestamp.fromDate(new Date()) }
  const tags = await exifReader.load(source, { expanded: true })

  // Strip bulky/unused tag groups
  if (tags.exif) delete tags.exif.MakerNote
  delete tags.Thumbnail
  delete tags.icc
  delete tags.iptc
  delete tags.xmp

  const { exif } = tags

  if (exif) {
    // Model & Lens — resolve renames in parallel
    const modelPromise =
      'Make' in exif && 'Model' in exif
        ? (async () => {
            const make = exif.Make!.description
            let model = exif.Model!.description
            if (model.toLowerCase() === 'model') model = CONFIG.unknownModel
            const makeWords = make.split(' ')
            const modelWords = model.split(' ')
            const raw = makeWords.some((w) => modelWords.includes(w)) ? model : `${make} ${model}`
            return resolveRename(raw)
          })()
        : null

    const lensPromise = 'LensModel' in exif ? resolveRename(exif.LensModel!.description) : null

    const [resolvedModel, resolvedLens] = await Promise.all([modelPromise, lensPromise])
    if (resolvedModel) result.model = resolvedModel
    if (resolvedLens) result.lens = resolvedLens

    // Date
    if ('DateTimeOriginal' in exif) {
      const isoDate = exif.DateTimeOriginal!.description.replace(rexDate, '$1-$2-$3')
      const fields = getDateFields(isoDate)
      result.date = fields.date
      result.year = fields.year
      result.month = fields.month
      result.day = fields.day
    }

    // Numeric EXIF fields
    if ('ApertureValue' in exif) result.aperture = parseFloat(exif.ApertureValue!.description)
    if ('ExposureTime' in exif) {
      const shutter = exif.ExposureTime!.value[0] / exif.ExposureTime!.value[1]
      result.shutter = shutter <= 0.1 ? `1/${Math.round(1 / shutter)}` : `${shutter}`
    }
    if ('FocalLength' in exif) result.focal_length = parseInt(exif.FocalLength!.description)
    if ('ISOSpeedRatings' in exif) result.iso = parseInt(exif.ISOSpeedRatings!.description)
    if ('Flash' in exif) result.flash = !exif.Flash!.description.startsWith('Flash did not')
  }

  // Dimensions from file metadata
  if (tags.file && 'Image Height' in tags.file && 'Image Width' in tags.file) {
    result.dim = [tags.file['Image Width']!.value, tags.file['Image Height']!.value]
  }

  // Fallback: load image to get dimensions. A local File/Blob is decoded directly,
  // avoiding a network round-trip for data we already hold.
  if (!result.dim || result.dim[0] === 0 || result.dim[1] === 0) {
    try {
      if (typeof createImageBitmap !== 'undefined') {
        const bmp =
          typeof source === 'string'
            ? await createImageBitmap(await (await fetch(source)).blob())
            : await createImageBitmap(source)
        result.dim = [bmp.width, bmp.height]
        bmp.close()
      } else {
        const img = new Image()
        let objectUrl = ''
        if (typeof source === 'string') {
          img.crossOrigin = 'anonymous'
          img.src = source
        } else {
          objectUrl = URL.createObjectURL(source)
          img.src = objectUrl
        }
        try {
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
          })
          if (img.naturalWidth && img.naturalHeight) {
            result.dim = [img.naturalWidth, img.naturalHeight]
          }
        } finally {
          if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.warn('Failed to get image dimensions', e)
    }
  }

  // GPS
  if (tags.gps && tags.gps.Latitude !== undefined && tags.gps.Longitude !== undefined) {
    result.loc = `${tags.gps.Latitude.toFixed(6)}, ${tags.gps.Longitude.toFixed(6)}`
  }

  return result
}

export default readExif
