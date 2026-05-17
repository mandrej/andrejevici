import { initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'

initializeApp()

// Cache singleton – avoids repeated SDK look-ups
let _db: Firestore | undefined
const db = () => (_db ??= getFirestore())

interface ValuesState {
  headlineToApply: string
  tagsToApply: string[]
  values: {
    kind: { [key: string]: number }
    year: { [key: string]: number }
    tags: { [key: string]: number }
    model: { [key: string]: number }
    lens: { [key: string]: number }
    email: { [key: string]: number }
    nick: { [key: string]: number }
  }
}

const COUNTER_FIELDS: (keyof ValuesState['values'])[] = [
  'kind',
  'year',
  'tags',
  'model',
  'lens',
  'email',
  'nick',
]

const delimiter = '||' // for counter id
const counterId = (field: string, value: string | number): string => {
  return `${field}${delimiter}${value}`.replace(/\//g, '%2F')
}

/** Commit an array of write-batch operations in chunks of up to 500. */
const commitBatches = async (
  ops: Array<(batch: FirebaseFirestore.WriteBatch) => void>,
): Promise<void> => {
  const MAX_BATCH = 500
  const promises: Promise<FirebaseFirestore.WriteResult[]>[] = []

  for (let i = 0; i < ops.length; i += MAX_BATCH) {
    const batch = db().batch()
    const chunk = ops.slice(i, i + MAX_BATCH)
    for (const op of chunk) {
      op(batch)
    }
    promises.push(batch.commit())
  }

  await Promise.all(promises)
}

// Build new counters — only fetches the fields we need
const buildCounters = async (): Promise<ValuesState['values']> => {
  const newValues: ValuesState['values'] = {
    kind: {},
    year: {},
    tags: {},
    model: {},
    lens: {},
    email: {},
    nick: {},
  }

  // select() fetches only the listed fields, drastically reducing data transfer
  const querySnapshot = await db()
    .collection('Photo')
    .select(...COUNTER_FIELDS)
    .get()

  querySnapshot.forEach((doc) => {
    const obj = doc.data() as Record<string, unknown>
    for (const field of COUNTER_FIELDS) {
      if (field === 'tags') {
        const tags = Array.isArray(obj.tags) ? obj.tags : []
        for (const tag of tags) {
          newValues.tags[tag] = (newValues.tags[tag] ?? 0) + 1
        }
      } else {
        const val = obj[field]
        if (val !== undefined && val !== null && val !== '') {
          newValues[field][val as string] = (newValues[field][val as string] ?? 0) + 1
        }
      }
    }
  })
  return newValues
}

// 5PM America/Los_Angeles = 2AM Europe/Paris
export const cronCounters = onSchedule(
  { schedule: '0 17 */3 * *', region: 'us-central1', timeZone: 'America/Los_Angeles' },
  async () => {
    logger.log('cronCounters START')

    // Run buildCounters and fetch existing counters in parallel
    const [newValues, existingSnapshot] = await Promise.all([
      buildCounters(),
      db().collection('Counter').get(),
    ])

    // Delete all existing counters using batched writes
    const deleteOps = existingSnapshot.docs.map((doc) => (batch: FirebaseFirestore.WriteBatch) => {
      batch.delete(doc.ref)
    })
    await commitBatches(deleteOps)
    logger.log(`cronCounters deleted ${deleteOps.length} existing counters`)

    // Create new counters using batched writes
    const counterRef = db().collection('Counter')
    const writeOps: Array<(batch: FirebaseFirestore.WriteBatch) => void> = []

    for (const field of COUNTER_FIELDS) {
      for (const [key, count] of Object.entries(newValues[field])) {
        const docRef = counterRef.doc(counterId(field, key))
        writeOps.push((batch) => {
          batch.set(docRef, { field, value: key, count })
        })
      }
    }

    await commitBatches(writeOps)
    logger.log(`cronCounters created ${writeOps.length} new counters`)
  },
)

// 6PM America/Los_Angeles = 3AM Europe/Paris
export const cronBucket = onSchedule(
  { schedule: '0 18 */3 * *', region: 'us-central1', timeZone: 'America/Los_Angeles' },
  async () => {
    logger.log('cronBucket START')
    const res = {
      count: 0,
      size: 0,
    }

    // Only fetch the 'size' field — no need to download full documents
    const querySnapshot = await db().collection('Photo').select('size').get()

    querySnapshot.forEach((doc) => {
      res.count++
      res.size += (doc.data().size as number) ?? 0
    })

    await db().collection('Bucket').doc('total').set(res)
    logger.log(`cronBucket done: ${res.count} photos, ${res.size} bytes`)
  },
)
