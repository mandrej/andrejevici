import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import PromisePool from 'es6-promise-pool'
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

// 5PM America/Los_Angeles = 2AM Europe/Paris
export const cronCounters = onSchedule(
  { schedule: '0 17 */3 * *', region: 'us-central1', timeZone: 'America/Los_Angeles' },
  async () => {
    logger.log('cronCounters START')
    const newValues = await buildCounters()

    const query = getFirestore().collection('Counter')
    const querySnapshot = await query.get()

    querySnapshot.forEach((doc) => {
      getFirestore().collection('Counter').doc(doc.id).delete()
    })

    // Create an array of all write operations
    const writeOperations: Array<{ field: string; key: string; count: number }> = []
    for (const field in newValues) {
      for (const [key, count] of Object.entries(newValues[field as keyof ValuesState['values']])) {
        writeOperations.push({ field, key, count })
      }
    }

    // Generator function to create promises for the pool
    let operationIndex = 0
    const promiseProducer = (): Promise<FirebaseFirestore.WriteResult> | undefined => {
      if (operationIndex >= writeOperations.length) {
        return undefined
      }

      const { field, key, count } = writeOperations[operationIndex]
      operationIndex++

      return getFirestore()
        .collection('Counter')
        .doc(counterId(field, key))
        .set({ field, value: key, count })
    }

    // Create and execute the promise pool with concurrency of 5
    const pool = new PromisePool(promiseProducer, 5)
    await pool.start()

    logger.log(`cronCounters ${operationIndex} / ${writeOperations.length} operations`)
  },
)

// 6PM America/Los_Angeles = 3AM Europe/Paris
export const cronBucket = onSchedule(
  { schedule: '0 18 */3 * *', region: 'us-central1', timeZone: 'America/Los_Angeles' },
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
