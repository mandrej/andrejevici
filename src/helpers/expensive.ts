import { query, orderBy, getDocs } from 'firebase/firestore'
import { CONFIG } from 'src/helpers'
import { photosCol } from 'src/helpers/collections'

import type { ValuesState } from 'src/helpers/models'

/**
 * Builds counters for each field in CONFIG.photo_filter in the database and store.
 *
 * @return {ValuesState['values']} The new values.
 */
export const buildCounters = async (): Promise<ValuesState['values']> => {
  // Build new counters
  const photoSnapshot = await getDocs(query(photosCol, orderBy('date', 'desc')))
  const newValues: ValuesState['values'] = {
    year: {},
    tags: {},
    model: {},
    lens: {},
    email: {},
    nick: {},
  }

  photoSnapshot.forEach((doc) => {
    const obj = doc.data() as Record<string, unknown>
    CONFIG.photo_filter.forEach((field) => {
      if (field === 'tags') {
        const tags = Array.isArray(obj.tags) ? obj.tags : []
        for (const tag of tags) {
          newValues.tags[tag] = (newValues.tags[tag] ?? 0) + 1
        }
      } else {
        const val = obj[field]
        if (val !== undefined && val !== null && val !== '') {
          newValues[field as keyof ValuesState['values']][val as string] =
            (newValues[field as keyof ValuesState['values']][val as string] ?? 0) + 1
        }
      }
    })
  })

  return newValues
}
