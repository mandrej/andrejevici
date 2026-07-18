import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../firebase'
import { doc, query, orderBy, getDocs, writeBatch, increment, where } from 'firebase/firestore'
import { isEmpty, delimiter, counterId, months } from '../helpers'
import CONFIG from '../config'
import { counterCollection, photoCollection } from '../helpers/collections'
import notify from '../helpers/notify'
import type { PhotoType, ValuesState, Suggestion } from '../helpers/models'

interface ValuesStore extends ValuesState {
  fetchValues: () => Promise<void>
  countersBuild: (targetField?: string) => Promise<void>
  buildCounterObject: (data: PhotoType) => Record<string, number>
  updateCounters: (oldData: PhotoType | null, newData: PhotoType | null) => void
  batchUpdateCounters: (toAdd: string[], toRemove: string[]) => Promise<void>
  addNewValue: (inputValue: string, field: keyof ValuesState['values'], done: (value: string) => void) => void
}

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

const byCountReverse = (
  values: ValuesState['values'],
  field: keyof ValuesState['values'],
): Record<string, number> => {
  return Object.fromEntries(
    Object.entries(values[field] || {})
      .sort(([, a], [, b]) => b - a)
      .filter(([, v]) => v > 0),
  )
}

const sortByCountReverse = (values: ValuesState['values'], field: keyof ValuesState['values']): string[] =>
  Object.keys(byCountReverse(values, field))

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

const makeSuggestion = (field: string, value: string, count?: number): Suggestion => ({
  key: `${field}-${value}`,
  field: field === 'nick' ? 'author' : field,
  value,
  ...(count !== undefined && { count }),
})

export const useValuesStore = create<ValuesStore>()(
  persist(
    (set, get) => ({
      headlineToApply: CONFIG.noTitle,
      tagsToApply: [],
      values: { kind: {}, year: {}, tags: {}, model: {}, lens: {}, email: {}, nick: {} },

      fetchValues: async () => {
        try {
          const querySnapshot = await getDocs(query(counterCollection))
          const newValues: ValuesState['values'] = {
            kind: {},
            year: {},
            tags: {},
            model: {},
            lens: {},
            email: {},
            nick: {},
          }
          querySnapshot.forEach((d) => {
            const obj = d.data() as { count: number; field: string; value: string }
            const field = obj.field as keyof ValuesState['values']
            if (newValues[field]) {
              const current = newValues[field][obj.value] || 0
              newValues[field][obj.value] = current + obj.count
            }
          })
          set({ values: newValues })
        } catch (err) {
          console.error('Failed to read values:', err)
        }
      },

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

      addNewValue: (inputValue: string, field: keyof ValuesState['values'], done: (value: string) => void) => {
        set((state) => {
          const updatedValues = { ...state.values }
          updatedValues[field] = { ...updatedValues[field], [inputValue]: 0 }
          return { values: updatedValues }
        })
        done(inputValue)
      },
    }),
    {
      name: 'values-storage',
      partialize: (state) => ({
        headlineToApply: state.headlineToApply,
        tagsToApply: state.tagsToApply,
        values: state.values,
      }),
    },
  ),
)

// Selectors / Getters
export const selectTagsValues = (state: ValuesStore) => Object.keys(state.values.tags || {}).sort()
export const selectModelValues = (state: ValuesStore) => sortByCountReverse(state.values, 'model')
export const selectLensValues = (state: ValuesStore) => sortByCountReverse(state.values, 'lens')
export const selectEmailValues = (state: ValuesStore) => sortByCountReverse(state.values, 'email')
export const selectNickValues = (state: ValuesStore) => sortByCountReverse(state.values, 'nick')
export const selectKindValues = (state: ValuesStore) => sortByCountReverse(state.values, 'kind')
export const selectYearValues = (state: ValuesStore) => Object.keys(state.values.year || {}).reverse()
export const selectNickWithCount = (state: ValuesStore) => byCountReverse(state.values, 'nick')

export const selectAllSuggestions = (state: ValuesStore): Suggestion[] => {
  const suggestions: Suggestion[] = []

  const kindValues = selectKindValues(state)
  const nickValues = selectNickValues(state)
  const tagsValues = selectTagsValues(state)
  const yearValues = selectYearValues(state)
  const modelValues = selectModelValues(state)
  const lensValues = selectLensValues(state)

  const countedFields = [
    { field: 'kind', values: kindValues },
    { field: 'nick', values: nickValues },
    { field: 'tags', values: tagsValues },
    { field: 'year', values: yearValues },
    { field: 'model', values: modelValues },
    { field: 'lens', values: lensValues },
  ] as const

  for (const { field, values } of countedFields) {
    for (const value of values) {
      suggestions.push(makeSuggestion(field, value, state.values[field][value]))
    }
  }

  months.forEach((month, index) => {
    suggestions.push({ key: `month-${index + 1}`, field: 'month', value: month })
  })

  for (let i = 1; i <= 31; i++) {
    suggestions.push({ key: `day-${i}`, field: 'day', value: i.toString() })
  }

  return suggestions
}
