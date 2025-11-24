import { defineStore, acceptHMRUpdate } from 'pinia'
import { db } from 'src/lib/firebase'
import {
  doc,
  query,
  where,
  orderBy,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore'
import notify from 'src/helpers/notify'
import { buildCounters } from 'src/helpers/expensive'
import { CONFIG, isEmpty } from 'src/helpers'
import { deepDiffMap } from 'src/helpers/diff'
import { photosCol, countersCol } from 'src/helpers/collections'
import type { DocumentReference } from 'firebase/firestore'
import type { PhotoType, ValuesState } from 'src/helpers/models'
import type { DiffResult } from 'src/helpers/diff'

const counterId = (field: string, value: string): string => {
  return `Photo||${field}||${value}`
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
  return Object.entries(state.values[field])
    .sort(([, a], [, b]) => b - a)
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {}) as { [key: string]: number }
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
      const emails = byCountReverse(state, 'nick')
      return Object.keys(emails)
        .filter((key): key is string => emails[key]! > 0)
        .reduce(
          (obj, key): { [key: string]: number } => {
            obj[key] = emails[key]!
            return obj
          },
          {} as { [key: string]: number },
        )
    },
    tagsWithCount: (state: ValuesState): { [key: string]: number } => {
      return Object.keys(state.values.tags)
        .sort()
        .filter((key): key is string => state.values.tags[key]! > 0)
        .reduce(
          (obj, key): { [key: string]: number } => {
            const count = state.values.tags[key]
            if (count !== undefined) {
              obj[key] = count
            }
            return obj
          },
          {} as { [key: string]: number },
        )
    },
  },
  actions: {
    /**
     * Gets the count of each value for a specific field.
     *
     * @param {keyof ValuesState['values']} field - The field to get the count for.
     * @return {Promise<void>} A promise that resolves when the count is retrieved.
     */
    async fieldCount(field: keyof ValuesState['values']): Promise<void> {
      const q = query(countersCol, where('field', '==', field))
      const querySnapshot = await getDocs(q)
      querySnapshot.forEach((d) => {
        const obj = d.data() as {
          count: number
          field: string
          value: string
        }
        this.values[field][obj.value] = obj.count
      })
    },

    /**
     * Builds counters for each field in CONFIG.photo_filter in the database and store.
     * Deletes old counters and builds new ones based on the values in the Photo collection.
     *
     * @return {Promise<void>} A promise that resolves when the counters have been built.
     */
    async countersBuild(): Promise<void> {
      notify({ group: 'counters', message: `Please wait` })

      // Build new counters
      const newValues = await buildCounters()

      // Delete old counters
      const countersToDelete = await getDocs(query(countersCol))
      const deleteBatch = writeBatch(db)
      countersToDelete.forEach((doc) => deleteBatch.delete(doc.ref))
      await deleteBatch.commit()
      notify({ group: 'counters', message: `Deleted old counters` })

      // Write new counters to database and store
      const setBatch = writeBatch(db)
      CONFIG.photo_filter.forEach((field) => {
        Object.entries(newValues[field as keyof ValuesState['values']]).forEach(([key, count]) => {
          const counterRef = doc(countersCol, counterId(field, key))
          setBatch.set(counterRef, { count, field, value: key })
        })
        // const diff = deepDiffMap(
        //   this.values[field as keyof ValuesState['values']],
        //   newValues[field as keyof ValuesState['values']],
        // )
        // const messages: string[] = []
        // for (const change of diff) {
        //   messages.push(`${change.key} ${change.status}`)
        // }
        // overwrite old values in the store
        this.values[field as keyof ValuesState['values']] = {
          ...newValues[field as keyof ValuesState['values']],
        }
        // notify({
        //   message: messages.join('\n') || `No changes for ${field}`,
        //   actions: [{ icon: 'close' }],
        //   timeout: messages.length > 0 ? 0 : 5000,
        //   multiLine: true,
        // })
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
     * It builds a diff of the counters that have changed, and then calls batchUpdateCounters
     * with the diff.
     *
     * @param {PhotoType | null} oldData - The old data to update counters from.
     * @param {PhotoType | null} newData - The new data to update counters from.
     */
    updateCounters(oldData: PhotoType | null, newData: PhotoType | null): void {
      const oldObj = oldData ? this.buildCounterMap(oldData) : {}
      const newObj = newData ? this.buildCounterMap(newData) : {}

      // Early return if both are empty
      if (isEmpty(oldObj) && isEmpty(newObj)) return

      let diff: DiffResult[]

      if (!isEmpty(oldObj) && !isEmpty(newObj)) {
        // Both exist: compute diff
        diff = deepDiffMap(oldObj, newObj)
      } else if (!isEmpty(newObj)) {
        // Only new data: all created
        diff = Object.entries(newObj).map(([key, val]) => ({
          key,
          status: 'created',
          value: val,
        }))
      } else {
        // Only old data: all deleted
        diff = Object.entries(oldObj).map(([key, val]) => ({
          key,
          status: 'deleted',
          value: val,
        }))
      }
      this.batchUpdateCounters(diff)
    },

    /**
     * Updates the counters in the database and store based on the results of the deep diff.
     * It commits a batch write to the database and updates the store with the new values.
     *
     * @param {DiffResult[]} results - The results of the deep diff.
     * @return {Promise<void>} A promise that resolves when the batch has been committed.
     */
    async batchUpdateCounters(results: DiffResult[]): Promise<void> {
      const batch = writeBatch(db)

      for (const todo of results) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, field, value] = todo.key.split('||')
        const counterRef = doc(countersCol, todo.key)
        const findDoc = await getDoc(counterRef)
        if (todo.status === 'created') {
          if (findDoc.exists()) {
            const findCount = findDoc.data().count
            this.values[field as keyof ValuesState['values']][value as string] = findCount + 1
            batch.update(counterRef, {
              count: findCount + 1,
            })
            if (process.env.DEV) console.log('inrcease existing', todo.key, findCount + 1)
          } else {
            this.values[field as keyof ValuesState['values']][value as string] = 1
            batch.set(counterRef, { count: 1, field: field, value: value })
            if (process.env.DEV) console.log('inrcease new', todo.key, 1)
          }
        }
        if (todo.status === 'deleted') {
          if (findDoc.exists()) {
            const findCount = findDoc.data().count
            if (findCount - 1 <= 0) {
              delete this.values[field as keyof ValuesState['values']][value as string]
              batch.delete(counterRef)
              if (process.env.DEV) console.log('decrese and delete', todo.key, 0)
            } else {
              this.values[field as keyof ValuesState['values']][value as string] = findCount - 1
              batch.update(counterRef, {
                count: findCount - 1,
              })
              if (process.env.DEV) console.log('decrese existing', todo.key, findCount - 1)
            }
          } else {
            this.values[field as keyof ValuesState['values']][value as string] = 1
            batch.set(counterRef, { count: 1, field: field, value: value })
          }
        }
      }
      await batch.commit()
    },

    /**
     * Removes all tags from the store and database that are not used by any photo.
     * @return {Promise<void>} A promise that resolves when all unused tags have been removed.
     */
    async removeUnusedTags(): Promise<void> {
      // delete from store
      let id, counterRef: DocumentReference
      for (const [value, count] of Object.entries(this.values.tags)) {
        if (typeof count === 'number' && count <= 0) {
          try {
            id = counterId('tags', value)
            counterRef = doc(countersCol, id)
            await deleteDoc(counterRef)
          } finally {
            delete this.values.tags[value]
          }
        }
      }
      // delete from database
      const q = query(countersCol, where('field', '==', 'tags'))
      const querySnapshot = await getDocs(q)

      // Use for...of loop instead of forEach to properly handle async operations
      for (const d of querySnapshot.docs) {
        const obj = d.data()
        if (obj.count <= 0) {
          try {
            const id = counterId('tags', obj.value)
            const counterRef = doc(countersCol, id)
            await deleteDoc(counterRef)
          } finally {
            delete this.values.tags[obj.value]
          }
        }
      }
    },
    /**
     * Renames a value in the store and database.
     *
     * @param {keyof ValuesState['values']} field - The field of the value to rename.
     * @param {string} oldValue - The old value to rename.
     * @param {string} newValue - The new value to rename to.
     * @return {Promise<void>} A promise that resolves when the value has been renamed.
     */
    async renameValue(
      field: keyof ValuesState['values'],
      oldValue: string,
      newValue: string,
    ): Promise<void> {
      // Prepare batch for photo updates
      const batch = writeBatch(db)
      const filter =
        field === 'tags'
          ? where(field, 'array-contains-any', [oldValue])
          : where(field, '==', oldValue)
      const q = query(photosCol, filter, orderBy('date', 'desc'))
      const querySnapshot = await getDocs(q)

      querySnapshot.forEach((d) => {
        const photoRef = doc(photosCol, d.id)
        if (field === 'tags') {
          const obj = d.data()
          const idx = obj.tags.indexOf(oldValue)
          obj.tags.splice(idx, 1, newValue)
          batch.update(photoRef, { [field]: obj.tags })
        } else {
          batch.update(photoRef, { [field]: newValue })
        }
      })

      // Commit batch for photos
      await batch.commit()

      // Update counters
      const oldRef = doc(countersCol, counterId(field, oldValue))
      const newRef = doc(countersCol, counterId(field, newValue))
      const counter = await getDoc(oldRef)
      const obj = counter.data()

      if (obj) {
        await setDoc(
          newRef,
          {
            count: obj.count,
            field: field,
            value: newValue,
          },
          { merge: true },
        )
        await deleteDoc(oldRef)

        // Update store
        this.values[field][newValue] = obj.count
        delete this.values[field][oldValue]
      }
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
