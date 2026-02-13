import { defineStore, acceptHMRUpdate } from 'pinia'
import { db } from 'src/boot/firebase'
import { doc, query, orderBy, getDocs, writeBatch, increment } from 'firebase/firestore'
import { isEmpty, delimiter, counterId, months } from 'src/helpers'
import CONFIG from 'app/config'
import { counterCollection, photoCollection } from 'src/helpers/collections'
import notify from 'src/helpers/notify'
import type { PhotoType, ValuesState, Suggestion } from 'src/helpers/models'

/**
 * Builds counters for all photos in the database.
 * @returns A promise that resolves to the new values.
 */
const buildCounters = async (): Promise<ValuesState['values']> => {
  // Build new counters
  const photoSnapshot = await getDocs(query(photoCollection, orderBy('date', 'desc')))
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

export const useValuesStore = defineStore('meta', {
  state: (): ValuesState => ({
    headlineToApply: CONFIG.noTitle,
    tagsToApply: [],
    values: { year: {}, tags: {}, model: {}, lens: {}, email: {}, nick: {} },
  }),
  getters: {
    // values getters
    tagsValues: (state: ValuesState) => {
      return Object.keys(state.values.tags).sort()
    },
    modelValues: (state: ValuesState) => {
      return Object.keys(byCountReverse(state, 'model'))
    },
    lensValues: (state: ValuesState) => {
      return Object.keys(byCountReverse(state, 'lens'))
    },
    emailValues: (state: ValuesState) => {
      return Object.keys(byCountReverse(state, 'email'))
    },
    nickValues: (state: ValuesState) => {
      return Object.keys(byCountReverse(state, 'nick'))
    },
    yearValues: (state: ValuesState) => {
      return Object.keys(state.values.year).reverse()
    },
    // withCount
    yearWithCount: (state: ValuesState): Array<{ value: string; count: number }> => {
      const ret: Array<{ value: string; count: number }> = []
      for (const year of Object.keys(state.values.year).reverse()) {
        ret.push({ value: year, count: state.values.year[year] || 0 })
      }
      return ret
    },
    nickWithCount: (state: ValuesState): { [key: string]: number } => {
      return byCountReverse(state, 'nick')
    },
    tagsWithCount: (state: ValuesState): { [key: string]: number } => {
      return Object.fromEntries(
        Object.entries(state.values.tags)
          .sort(([a], [b]) => a.localeCompare(b))
          .filter(([, v]) => v > 0),
      )
    },
    allSuggestions(): Suggestion[] {
      const suggestions: Suggestion[] = []

      // Add authors
      this.nickValues.forEach((nick) => {
        const count = this.values.nick[nick]
        suggestions.push({
          key: `nick-${nick}`,
          field: 'author',
          value: nick,
          ...(count !== undefined && { count }),
        })
      })

      // Add tags
      this.tagsValues.forEach((tag) => {
        const count = this.values.tags[tag]
        suggestions.push({
          key: `tags-${tag}`,
          field: 'tags',
          value: tag,
          ...(count !== undefined && { count }),
        })
      })

      // Add years
      this.yearValues.forEach((year) => {
        const count = this.values.year[year]
        suggestions.push({
          key: `year-${year}`,
          field: 'year',
          value: year,
          ...(count !== undefined && { count }),
        })
      })

      // Add months (case-insensitive autocomplete)
      months.forEach((month, index) => {
        suggestions.push({
          key: `month-${index + 1}`,
          field: 'month',
          value: month,
        })
      })

      // Add days
      for (let i = 1; i <= 31; i++) {
        suggestions.push({
          key: `day-${i}`,
          field: 'day',
          value: i.toString(),
        })
      }

      // Add models
      this.modelValues.forEach((model) => {
        const count = this.values.model[model]
        suggestions.push({
          key: `model-${model}`,
          field: 'model',
          value: model,
          ...(count !== undefined && { count }),
        })
      })

      // Add lenses
      this.lensValues.forEach((lens) => {
        const count = this.values.lens[lens]
        suggestions.push({
          key: `lens-${lens}`,
          field: 'lens',
          value: lens,
          ...(count !== undefined && { count }),
        })
      })

      return suggestions
    },
  },
  actions: {
    /**
     * Reads the values from the database.
     */
    async readValues(): Promise<void> {
      const q = query(counterCollection)
      const querySnapshot = await getDocs(q)
      querySnapshot.forEach((d) => {
        const obj = d.data() as {
          count: number
          field: string
          value: string
        }
        this.values[obj.field as keyof ValuesState['values']][obj.value] = obj.count
      })
    },

    async countersBuild(): Promise<void> {
      notify({ group: 'counters', message: `Please wait` })

      // Build new counters
      const newValues = await buildCounters()

      // Delete old counters
      const countersToDelete = await getDocs(query(counterCollection))
      const deleteBatch = writeBatch(db)
      countersToDelete.forEach((doc) => deleteBatch.delete(doc.ref))
      await deleteBatch.commit()
      notify({ group: 'counters', message: `Deleted old counters` })

      // Write new counters to database and store
      const setBatch = writeBatch(db)
      CONFIG.photo_filter.forEach((field) => {
        const fieldKey = field as keyof ValuesState['values']
        Object.entries(newValues[fieldKey]).forEach(([key, count]) => {
          const counterRef = doc(counterCollection, counterId(field, key))
          setBatch.set(counterRef, { count, field, value: key })
        })
        this.values[fieldKey] = newValues[fieldKey]
        notify({ group: 'counters', message: `Built counters for ${field}` })
      })

      await setBatch.commit()
      notify({ group: 'counters', message: `All done` })
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

      // Early return if both are empty
      if (isEmpty(oldObj) && isEmpty(newObj)) return

      const toAdd: string[] = []
      const toRemove: string[] = []

      // Keys in new but not in old: increments
      for (const key in newObj) {
        if (!(key in oldObj)) toAdd.push(key)
      }
      // Keys in old but not in new: decrements
      for (const key in oldObj) {
        if (!(key in newObj)) toRemove.push(key)
      }

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
        const parts = key.split(delimiter)
        const field = parts[1] as keyof ValuesState['values']
        const value = parts[2] as string
        const currentCount = this.values[field][value] || 0
        const newCount = currentCount + 1

        this.values[field][value] = newCount

        const counterRef = doc(counterCollection, key)
        if (currentCount === 0) {
          batch.set(counterRef, { count: 1, field, value })
        } else {
          batch.update(counterRef, { count: increment(1) })
        }
        if (process.env.DEV) console.log('increase', key, newCount)
      }

      for (const key of toRemove) {
        const parts = key.split(delimiter)
        const field = parts[1] as keyof ValuesState['values']
        const value = parts[2] as string
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
