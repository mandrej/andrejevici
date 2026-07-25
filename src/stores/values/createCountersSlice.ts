import type { StateCreator } from 'zustand'
import { db } from '../../firebase'
import { doc, query, orderBy, getDocs, writeBatch, increment, where } from 'firebase/firestore'
import { isEmpty, delimiter, counterId } from '../../helpers'
import CONFIG from '../../config'
import { counterCollection, photoCollection } from '../../helpers/collections'
import notify from '../../helpers/notify'
import type { PhotoType, ValuesState } from '../../helpers/models'
import type { ValuesStore, CountersSliceActions } from './types'

const buildCounterMap = async (
  field: keyof ValuesState['values'],
): Promise<Record<string, number>> => {
  const photoSnapshot = await getDocs(query(photoCollection, orderBy('date', 'desc')))
  const counterMap: Record<string, number> = {}

  photoSnapshot.forEach((doc) => {
    const obj = doc.data() as PhotoType
    if (field === 'tags') {
      const tags = Array.isArray(obj.tags) ? obj.tags : []
      for (const tag of tags) {
        const id = counterId(field, tag)
        counterMap[id] = (counterMap[id] ?? 0) + 1
      }
    } else {
      const val = obj[field as keyof PhotoType]
      if (val !== undefined && val !== null && val !== '') {
        const id = counterId(field, val as string)
        counterMap[id] = (counterMap[id] ?? 0) + 1
      }
    }
  })
  return counterMap
}

const parseCounterKey = (key: string): { field: keyof ValuesState['values']; value: string } => {
  const parts = key.split(delimiter)
  return {
    field: parts[0] as keyof ValuesState['values'],
    value: parts.slice(1).join(delimiter).replace(/%2F/g, '/'),
  }
}

const commitInBatches = async <T>(
  items: T[],
  applyFn: (batch: ReturnType<typeof writeBatch>, item: T) => void,
): Promise<void> => {
  let batch = writeBatch(db)
  let count = 0
  for (const item of items) {
    applyFn(batch, item)
    count++
    if (count === 498) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }
  if (count > 0) await batch.commit()
}

export const createCountersSlice: StateCreator<
  ValuesStore,
  [],
  [],
  CountersSliceActions
> = (set, get) => ({
  countersBuild: async (targetField?: string) => {
    const fieldsToBuild = targetField ? [targetField] : CONFIG.photo_filter

    for (const f of fieldsToBuild) {
      const fieldKey = f as keyof ValuesState['values']
      notify({ group: 'counters', message: `Building counters for ${fieldKey}...`, timeout: 0 })

      const newCounterMap = await buildCounterMap(fieldKey)

      // Delete old counters for this field
      const countersToDelete = await getDocs(
        query(counterCollection, where('field', '==', fieldKey)),
      )
      await commitInBatches(countersToDelete.docs, (batch, d) => batch.delete(d.ref))

      // Write new counters
      const entries = Object.entries(newCounterMap)
      await commitInBatches(entries, (batch, [id, val]) => {
        const { value } = parseCounterKey(id)
        const counterRef = doc(counterCollection, id)
        batch.set(counterRef, { count: val, field: fieldKey, value })
      })

      // Update local state - merge counts for the same value across kinds
      const mergedValues: Record<string, number> = {}
      for (const [id, count] of entries) {
        const { value } = parseCounterKey(id)
        mergedValues[value] = (mergedValues[value] || 0) + count
      }

      set((state) => {
        const updatedValues = { ...state.values }
        updatedValues[fieldKey] = mergedValues
        return { values: updatedValues }
      })

      notify({
        type: 'positive',
        group: 'counters',
        message: `Built counters for ${fieldKey}`,
        icon: 'sym_r_check',
      })
    }

    notify({ type: 'positive', group: 'counters', message: 'All done', icon: 'sym_r_check' })
  },

  buildCounterObject: (data: PhotoType) => {
    const counterMap: Record<string, number> = {}
    const fields = CONFIG.photo_filter

    for (const field of fields) {
      const fieldValue = data[field as keyof typeof data]
      if (!fieldValue) continue

      if (field === 'tags') {
        for (const tag of fieldValue as string[]) {
          counterMap[counterId(field, tag)] = 1
        }
      } else {
        counterMap[counterId(field, fieldValue as string)] = 1
      }
    }

    return counterMap
  },

  updateCounters: (oldData: PhotoType | null, newData: PhotoType | null) => {
    const oldObj = oldData ? get().buildCounterObject(oldData) : {}
    const newObj = newData ? get().buildCounterObject(newData) : {}

    if (isEmpty(oldObj) && isEmpty(newObj)) return

    const toAdd = Object.keys(newObj).filter((key) => !(key in oldObj))
    const toRemove = Object.keys(oldObj).filter((key) => !(key in newObj))

    if (toAdd.length > 0 || toRemove.length > 0) {
      get().batchUpdateCounters(toAdd, toRemove)
    }
  },

  batchUpdateCounters: async (toAdd: string[], toRemove: string[]) => {
    const batch = writeBatch(db)
    const currentValues = { ...get().values }

    for (const key of toAdd) {
      const { field, value } = parseCounterKey(key)
      currentValues[field] = { ...currentValues[field] }
      const currentCount = currentValues[field][value] || 0

      currentValues[field][value] = currentCount + 1

      const counterRef = doc(counterCollection, key)
      if (currentCount === 0) {
        batch.set(counterRef, { count: 1, field, value })
      } else {
        batch.update(counterRef, { count: increment(1) })
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('increase', key, currentCount + 1)
      }
    }

    for (const key of toRemove) {
      const { field, value } = parseCounterKey(key)
      currentValues[field] = { ...currentValues[field] }
      const currentCount = currentValues[field][value] || 0
      const newCount = currentCount - 1

      const counterRef = doc(counterCollection, key)
      if (newCount <= 0) {
        delete currentValues[field][value]
        batch.delete(counterRef)
        if (process.env.NODE_ENV === 'development') {
          console.log('decrease and delete', key, 0)
        }
      } else {
        currentValues[field][value] = newCount
        batch.update(counterRef, { count: increment(-1) })
        if (process.env.NODE_ENV === 'development') {
          console.log('decrease', key, newCount)
        }
      }
    }

    set({ values: currentValues })
    await batch.commit()
  },
})
