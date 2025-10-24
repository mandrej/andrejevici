import { defineStore, acceptHMRUpdate } from 'pinia'
import { db } from '../lib/firebase'
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore'
import notify from '../helpers/notify'
import { CONFIG, isEmpty } from '../helpers'
import { deepDiffMap } from '../helpers/diff'
import type { DocumentReference } from 'firebase/firestore'
import type { PhotoType, ValuesState } from '../helpers/models'
import type { DiffResult } from '../helpers/diff'

const photosCol = collection(db, 'Photo')
const countersCol = collection(db, 'Counter')

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
    values: { year: {}, tags: {}, model: {}, lens: {}, nick: {} },
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
    async fieldCount(field: 'year' | 'tags' | 'model' | 'lens' | 'nick'): Promise<void> {
      const q = query(countersCol, where('field', '==', field))
      const querySnapshot = await getDocs(q)
      querySnapshot.forEach((d) => {
        const obj = d.data() as {
          count: number
          field: 'year' | 'tags' | 'model' | 'lens' | 'nick'
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
      notify({ message: `Please wait` })

      // Delete old counters
      const countersToDelete = await getDocs(query(countersCol))
      const deleteBatch = writeBatch(db)
      countersToDelete.forEach((doc) => deleteBatch.delete(doc.ref))
      await deleteBatch.commit()
      notify({ message: `Deleted old counters` })

      // Build new counters
      const photoSnapshot = await getDocs(query(photosCol, orderBy('date', 'desc')))
      const newValues: ValuesState['values'] = {
        year: {},
        tags: {},
        model: {},
        lens: {},
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

      // Write new counters to database and store
      const setBatch = writeBatch(db)
      CONFIG.photo_filter.forEach((field) => {
        Object.entries(newValues[field as keyof ValuesState['values']]).forEach(([key, count]) => {
          const counterRef = doc(db, 'Counter', counterId(field, key))
          setBatch.set(counterRef, { count, field, value: key })
        })
        const diff = deepDiffMap(
          this.values[field as keyof ValuesState['values']],
          newValues[field as keyof ValuesState['values']],
        )
        const messages: string[] = []
        for (const change of diff) {
          messages.push(`${change.key} ${change.status}`)
        }
        // overwrite old values in the store
        this.values[field as keyof ValuesState['values']] = {
          ...newValues[field as keyof ValuesState['values']],
        }
        notify({
          message: messages.join('\n') || `No changes for ${field}`,
          actions: [{ icon: 'close' }],
          timeout: messages.length > 0 ? 0 : 5000,
          multiLine: true,
        })
      })
      await setBatch.commit()

      notify({ message: `All done` })
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
      const oldObj: { [key: string]: number } = {}
      const newObj: { [key: string]: number } = {}

      if (oldData) {
        for (const field of CONFIG.photo_filter) {
          const oldFieldValue = oldData[field as keyof PhotoType]
          if (oldFieldValue) {
            if (field === 'tags') {
              for (const tag of oldFieldValue as string[]) {
                oldObj[counterId(field, tag)] = 1
              }
            } else {
              oldObj[counterId(field, oldFieldValue as string)] = 1
            }
          }
        }
      }

      if (newData) {
        for (const field of CONFIG.photo_filter) {
          const newFieldValue = newData[field as keyof PhotoType]
          if (newFieldValue) {
            if (field === 'tags') {
              for (const tag of newFieldValue as string[]) {
                newObj[counterId(field, tag)] = 1
              }
            } else {
              newObj[counterId(field, newFieldValue as string)] = 1
            }
          }
        }
      }

      if (!isEmpty(oldObj) && !isEmpty(newObj)) {
        const diff = deepDiffMap(oldObj, newObj)
        this.batchUpdateCounters(diff)
      } else if (isEmpty(oldObj) && !isEmpty(newObj)) {
        const newList = Object.entries(newObj).map(([key, val]) => ({
          key: key,
          status: 'created',
          value: val,
        }))
        this.batchUpdateCounters(newList)
      } else if (!isEmpty(oldObj) && isEmpty(newObj)) {
        const oldList = Object.entries(oldObj).map(([key, val]) => ({
          key: key,
          status: 'deleted',
          value: val,
        }))
        this.batchUpdateCounters(oldList)
      }
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
        const counterRef = doc(db, 'Counter', todo.key)
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
            counterRef = doc(db, 'Counter', id)
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
            const counterRef = doc(db, 'Counter', id)
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
        const photoRef = doc(db, 'Photo', d.id)
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
      const oldRef = doc(db, 'Counter', counterId(field, oldValue))
      const newRef = doc(db, 'Counter', counterId(field, newValue))
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
