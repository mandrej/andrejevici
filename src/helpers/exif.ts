import exifReader from 'exifreader'
import { formatDatum } from './index'
import type { ExifType } from './models'
import CONFIG from 'src/config'
import { getDoc, doc } from 'firebase/firestore'
import { renameCollection } from './collections'

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
    const snap = await getDoc(doc(renameCollection, safeId))
    return snap.exists() ? snap.data().newValue : value
  } catch (e) {
    if (process.env.DEV) console.warn('Failed to query Rename collection', e)
    return value
  }
}

/**
 * Reads the EXIF data from a file.
 *
 * @param {string} url - The URL of the file to read.
 * @return {Promise<ExifType | null>} A promise that resolves to an object containing the EXIF data, or null if the file does not contain EXIF data.
 */
const readExif = async (url: string): Promise<ExifType | null> => {
  const result: ExifType = { model: CONFIG.unknownModel, date: formatDatum(new Date()) }
  const tags = await exifReader.load(url, { expanded: true })

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
            const raw = makeWords.some((w) => modelWords.includes(w))
              ? model
              : `${make} ${model}`
            return resolveRename(raw)
          })()
        : null

    const lensPromise =
      'LensModel' in exif ? resolveRename(exif.LensModel.description) : null

    const [resolvedModel, resolvedLens] = await Promise.all([modelPromise, lensPromise])
    if (resolvedModel) result.model = resolvedModel
    if (resolvedLens) result.lens = resolvedLens

    // Date
    if ('DateTimeOriginal' in exif) {
      const isoDate = exif.DateTimeOriginal.description.replace(rexDate, '$1-$2-$3')
      const datum = new Date(isoDate)
      result.date = formatDatum(datum)
      result.year = datum.getFullYear()
      result.month = datum.getMonth() + 1
      result.day = datum.getDate()
    }

    // Numeric EXIF fields
    if ('ApertureValue' in exif) result.aperture = parseFloat(exif.ApertureValue.description)
    if ('ExposureTime' in exif) {
      const shutter = exif.ExposureTime.value[0] / exif.ExposureTime.value[1]
      result.shutter = shutter <= 0.1 ? `1/${Math.round(1 / shutter)}` : `${shutter}`
    }
    if ('FocalLength' in exif) result.focal_length = parseInt(exif.FocalLength.description)
    if ('ISOSpeedRatings' in exif) result.iso = parseInt(exif.ISOSpeedRatings.description)
    if ('Flash' in exif) result.flash = !exif.Flash.description.startsWith('Flash did not')
  }

  // Dimensions from file metadata
  if (tags.file && 'Image Height' in tags.file && 'Image Width' in tags.file) {
    result.dim = [tags.file['Image Width'].value, tags.file['Image Height'].value]
  }

  // Fallback: load image to get dimensions
  if (!result.dim || result.dim[0] === 0 || result.dim[1] === 0) {
    try {
      if (typeof createImageBitmap !== 'undefined') {
        const resp = await fetch(url)
        const blob = await resp.blob()
        const bmp = await createImageBitmap(blob)
        result.dim = [bmp.width, bmp.height]
        bmp.close()
      } else {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = url
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })
        if (img.naturalWidth && img.naturalHeight) {
          result.dim = [img.naturalWidth, img.naturalHeight]
        }
      }
    } catch (e) {
      if (process.env.DEV) console.warn('Failed to get image dimensions', e)
    }
  }

  // GPS
  if (tags.gps && 'Latitude' in tags.gps && 'Longitude' in tags.gps) {
    result.loc = `${tags.gps.Latitude.toFixed(6)}, ${tags.gps.Longitude.toFixed(6)}`
  }

  return result
}

export default readExif
