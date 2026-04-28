import { defineStore, acceptHMRUpdate } from 'pinia'
import { db } from '../firebase'
import { doc, query, orderBy, getDocs, writeBatch, increment, where } from 'firebase/firestore'
import { isEmpty, delimiter, counterId, months } from '../helpers'
import CONFIG from '../config'
import { counterCollection, photoCollection } from '../helpers/collections'
import notify from '../helpers/notify'
import type { PhotoType, ValuesState, Suggestion } from '../helpers/models'

/**
 * Builds counters for a specific field from all photos in the database.
 * @param field - The field to build counters for.
 * @returns A promise that resolves to the counter map for the given field.
 */
const buildCounters = async (
  field: keyof ValuesState['values'],
): Promise<Record<string, number>> => {
  const photoSnapshot = await getDocs(query(photoCollection, orderBy('date', 'desc')))
  const newValues: Record<string, number> = {}

  photoSnapshot.forEach((doc) => {
    const obj = doc.data() as Record<string, unknown>
    if (field === 'tags') {
      const tags = Array.isArray(obj.tags) ? obj.tags : []
      for (const tag of tags) {
        newValues[tag] = (newValues[tag] ?? 0) + 1
      }
    } else {
      const val = obj[field]
      if (val !== undefined && val !== null && val !== '') {
        newValues[val as string] = (newValues[val as string] ?? 0) + 1
      }
    }
  })
  return newValues
}

/**
 * Returns an object with keys sorted by their value in descending order.
 * @param state - The state to extract the values from.
 * @param field - The field to extract the values from.
 * @returns An object with keys sorted by their value in descending order.
 */
const byCountReverse = <T extends keyof ValuesState['values']>(
  state: ValuesState,
  field: T,
): { [key: string]: number } => {
  return Object.fromEntries(
    Object.entries(state.values[field])
      .sort(([, a], [, b]) => b - a)
      .filter(([, v]) => v > 0),
  )
}

/** Sorted keys from byCountReverse */
const sortedKeys = (state: ValuesState, field: keyof ValuesState['values']): string[] =>
  Object.keys(byCountReverse(state, field))

/** Extracts field and value from a counter ID string */
const parseCounterKey = (key: string): { field: keyof ValuesState['values']; value: string } => {
  const parts = key.split(delimiter)
  return {
    field: parts[1] as keyof ValuesState['values'],
    value: parts.slice(2).join(delimiter).replace(/%2F/g, '/'),
  }
}

/**
 * Commits items in batches of 498 to stay within Firestore's 500-operation limit.
 * @param items - Items to process in batches.
 * @param applyFn - Function to apply each item to the batch.
 */
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

/** Creates a Suggestion object from field data */
const makeSuggestion = (field: string, value: string, count?: number): Suggestion => ({
  key: `${field}-${value}`,
  field: field === 'nick' ? 'author' : field,
  value,
  ...(count !== undefined && { count }),
})

export const useValuesStore = defineStore('meta', {
  state: (): ValuesState => ({
    headlineToApply: CONFIG.noTitle,
    tagsToApply: [],
    values: { year: {}, tags: {}, model: {}, lens: {}, email: {}, nick: {} },
  }),
  persist: {
    pick: ['headlineToApply', 'tagsToApply', 'values'],
  },
  getters: {
    // values getters
    tagsValues: (state: ValuesState) => Object.keys(state.values.tags).sort(),
    modelValues: (state: ValuesState) => sortedKeys(state, 'model'),
    lensValues: (state: ValuesState) => sortedKeys(state, 'lens'),
    emailValues: (state: ValuesState) => sortedKeys(state, 'email'),
    nickValues: (state: ValuesState) => sortedKeys(state, 'nick'),
    yearValues: (state: ValuesState) => Object.keys(state.values.year).reverse(),

    // withCount
    yearWithCount: (state: ValuesState): Array<{ value: string; count: number }> =>
      Object.keys(state.values.year)
        .reverse()
        .map((year) => ({ value: year, count: state.values.year[year] || 0 })),

    nickWithCount: (state: ValuesState): { [key: string]: number } => byCountReverse(state, 'nick'),

    tagsWithCount: (state: ValuesState): { [key: string]: number } =>
      Object.fromEntries(
        Object.entries(state.values.tags)
          .sort(([a], [b]) => a.localeCompare(b))
          .filter(([, v]) => v > 0),
      ),

    allSuggestions(): Suggestion[] {
      const suggestions: Suggestion[] = []

      // Add counted fields (nick, tags, year, model, lens)
      const countedFields = [
        { field: 'nick', values: this.nickValues },
        { field: 'tags', values: this.tagsValues },
        { field: 'year', values: this.yearValues },
        { field: 'model', values: this.modelValues },
        { field: 'lens', values: this.lensValues },
      ] as const

      for (const { field, values } of countedFields) {
        for (const value of values) {
          suggestions.push(makeSuggestion(field, value, this.values[field][value]))
        }
      }

      // Add months (static, no counts)
      months.forEach((month, index) => {
        suggestions.push({ key: `month-${index + 1}`, field: 'month', value: month })
      })

      // Add days (static, no counts)
      for (let i = 1; i <= 31; i++) {
        suggestions.push({ key: `day-${i}`, field: 'day', value: i.toString() })
      }

      return suggestions
    },
  },
  actions: {
    /**
     * Reads the values from the database.
     */
    async readValues(): Promise<void> {
      const querySnapshot = await getDocs(query(counterCollection))
      querySnapshot.forEach((d) => {
        const obj = d.data() as { count: number; field: string; value: string }
        this.values[obj.field as keyof ValuesState['values']][obj.value] = obj.count
      })
    },

    async countersBuild(targetField?: string): Promise<void> {
      const fieldsToBuild = targetField ? [targetField] : CONFIG.photo_filter

      for (const f of fieldsToBuild) {
        const fieldKey = f as keyof ValuesState['values']
        notify({ group: 'counters', message: `Building counters for ${fieldKey}...`, timeout: 0 })

        const newValues = await buildCounters(fieldKey)

        // Delete old counters for this field
        const countersToDelete = await getDocs(
          query(counterCollection, where('field', '==', fieldKey)),
        )
        await commitInBatches(countersToDelete.docs, (batch, d) => batch.delete(d.ref))

        // Write new counters
        const entries = Object.entries(newValues)
        await commitInBatches(entries, (batch, [key, val]) => {
          const counterRef = doc(counterCollection, counterId(fieldKey, key))
          batch.set(counterRef, { count: val, field: fieldKey, value: key })
        })

        this.values[fieldKey] = newValues
        notify({
          type: 'positive',
          group: 'counters',
          message: `Built counters for ${fieldKey}`,
          icon: 'sym_r_check',
        })
      }

      notify({ type: 'positive', group: 'counters', message: `All done`, icon: 'sym_r_check' })
    },

    /**
     * Helper function to build counter map from photo data
     * @param {PhotoType} data - The photo data to extract counters from
     * @returns {Object} Map of counter IDs to count values
     */
    buildCounterMap(data: PhotoType): { [key: string]: number } {
      const counterMap: { [key: string]: number } = {}

      for (const field of CONFIG.photo_filter) {
        const fieldValue = data[field as keyof PhotoType]
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

    /**
     * Updates the counters in the database and store based on the old and new data.
     * It compares both data sets, finds the changed fields, and performs a batch update.
     *
     * @param {PhotoType | null} oldData - The old data to update counters from.
     * @param {PhotoType | null} newData - The new data to update counters from.
     */
    updateCounters(oldData: PhotoType | null, newData: PhotoType | null): void {
      const oldObj = oldData ? this.buildCounterMap(oldData) : {}
      const newObj = newData ? this.buildCounterMap(newData) : {}

      if (isEmpty(oldObj) && isEmpty(newObj)) return

      const toAdd = Object.keys(newObj).filter((key) => !(key in oldObj))
      const toRemove = Object.keys(oldObj).filter((key) => !(key in newObj))

      if (toAdd.length > 0 || toRemove.length > 0) {
        this.batchUpdateCounters(toAdd, toRemove)
      }
    },

    /**
     * Updates the counters in the database and store based on the calculated changes.
     * It commits a batch write to the database using increments and updates the local store.
     *
     * @param {string[]} toAdd - List of counter IDs to increment.
     * @param {string[]} toRemove - List of counter IDs to decrement.
     * @return {Promise<void>} A promise that resolves when the batch has been committed.
     */
    async batchUpdateCounters(toAdd: string[], toRemove: string[]): Promise<void> {
      const batch = writeBatch(db)

      for (const key of toAdd) {
        const { field, value } = parseCounterKey(key)
        const currentCount = this.values[field][value] || 0

        this.values[field][value] = currentCount + 1

        const counterRef = doc(counterCollection, key)
        if (currentCount === 0) {
          batch.set(counterRef, { count: 1, field, value })
        } else {
          batch.update(counterRef, { count: increment(1) })
        }
        if (process.env.DEV) console.log('increase', key, currentCount + 1)
      }

      for (const key of toRemove) {
        const { field, value } = parseCounterKey(key)
        const currentCount = this.values[field][value] || 0
        const newCount = currentCount - 1

        const counterRef = doc(counterCollection, key)
        if (newCount <= 0) {
          delete this.values[field][value]
          batch.delete(counterRef)
          if (process.env.DEV) console.log('decrease and delete', key, 0)
        } else {
          this.values[field][value] = newCount
          batch.update(counterRef, { count: increment(-1) })
          if (process.env.DEV) console.log('decrease', key, newCount)
        }
      }

      await batch.commit()
    },

    /**
     * Adds a new value to the specified field in the values state
     * @param inputValue - The value to be added
     * @param field - The field key in the values state where the value should be added
     * @param done - Callback function to be called after the value is added
     * @returns void
     */
    addNewValue(
      inputValue: string,
      field: keyof ValuesState['values'],
      done: (value: string) => void,
    ) {
      this.values[field][inputValue] = 0
      done(inputValue)
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useValuesStore, import.meta.hot))
}
