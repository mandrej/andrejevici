import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
// import PromisePool from 'es6-promise-pool'
import * as logger from 'firebase-functions/logger'

initializeApp()

interface ValuesState {
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

const delimiter = '||' // for counter id

const counterId = (field: string, value: string): string => {
  return `Photo${delimiter}${field}${delimiter}${value}` // FIXME Photo is hard coded
}

// Build new counters
const buildCounters = async (): Promise<ValuesState['values']> => {
  const newValues: ValuesState['values'] = {
    year: {},
    tags: {},
    model: {},
    lens: {},
    email: {},
    nick: {},
  }
  const query = getFirestore().collection('Photo').orderBy('date', 'desc')
  const querySnapshot = await query.get()

  querySnapshot.forEach((doc) => {
    const obj = doc.data() as Record<string, unknown>
    Object.keys(newValues).forEach((field) => {
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

// every 3 days at 02:00
export const cronCounters = onSchedule(
  { schedule: '0 2 */3 * *', region: 'us-central1', timeZone: 'America/Los_Angeles' },
  async () => {
    logger.log('Get new value')
    const newValues = await buildCounters()

    logger.log('Delete old value')
    const query = getFirestore().collection('Counter')
    const querySnapshot = await query.get()

    querySnapshot.forEach((doc) => {
      getFirestore().collection('Counter').doc(doc.id).delete()
    })

    logger.log('Write new value')
    for (const field in newValues) {
      for (const [key, count] of Object.entries(newValues[field as keyof ValuesState['values']])) {
        getFirestore()
          .collection('Counter')
          .doc(counterId(field, key))
          .set({ field, value: key, count })
      }
    }
  },
)

// every 3 days at 03:00
export const cronBucket = onSchedule(
  { schedule: '0 3 */3 * *', region: 'us-central1', timeZone: 'America/Los_Angeles' },
  async () => {
    logger.log('Get new value')
    const res = {
      count: 0,
      size: 0,
    }
    const query = getFirestore().collection('Photo').orderBy('date', 'desc')
    const querySnapshot = await query.get()

    querySnapshot.forEach((doc) => {
      const obj = doc.data() as Record<string, unknown>
      res.count++
      res.size += obj.size as number
    })

    logger.log('Write new value')
    getFirestore().collection('Bucket').doc('total').set(res)
  },
)
