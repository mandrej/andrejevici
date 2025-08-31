import { defineStore, acceptHMRUpdate } from 'pinia'
import { db } from '../boot/fire'
import {
  doc,
  collection,
  query,
  where,
  orderBy,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore'
import notify from '../helpers/notify'
import { CONFIG } from '../helpers'
import type { DocumentReference } from 'firebase/firestore'
import type { PhotoType, ValuesState } from '../helpers/models'
import { deepDiffMap } from '../helpers/diff'

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
    values: { year: {}, tags: {}, model: {}, lens: {}, email: {} },
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
    emailWithCount: (state: ValuesState): { [key: string]: number } => {
      const emails = byCountReverse(state, 'email')
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
     * Retrieves the count of values for a given field from the database
     * and updates the corresponding values in the store.
     *
     * @param {('year' | 'tags' | 'model' | 'lens' | 'email')} field - The field to retrieve counts for.
     * @return {Promise<void>} A promise that resolves when the counts have been retrieved and the store has been updated.
     */
    async fieldCount(field: 'year' | 'tags' | 'model' | 'lens' | 'email'): Promise<void> {
      const q = query(countersCol, where('field', '==', field))
      const querySnapshot = await getDocs(q)
      querySnapshot.forEach((d) => {
        const obj = d.data() as {
          count: number
          field: 'year' | 'tags' | 'model' | 'lens' | 'email'
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
      notify({ message: `Please wait`, group: 'build' })

      // Delete old counters
      const countersToDelete = await getDocs(query(countersCol))
      const deleteBatch = writeBatch(db)
      countersToDelete.forEach((doc) => deleteBatch.delete(doc.ref))
      await deleteBatch.commit()
      notify({ message: `Deleted old counters`, group: 'build' })

      // Build new counters
      const photoSnapshot = await getDocs(query(photosCol, orderBy('date', 'desc')))
      const newValues: ValuesState['values'] = {
        year: {},
        tags: {},
        model: {},
        lens: {},
        email: {},
      }

      photoSnapshot.forEach((doc) => {
        const obj = doc.data()
        CONFIG.photo_filter.forEach((field) => {
          if (field === 'tags') {
            obj[field].forEach((tag: string) => {
              newValues[field][tag] = (newValues[field][tag] ?? 0) + 1
            })
          } else if (obj[field]) {
            newValues[field as keyof ValuesState['values']][obj[field]] =
              (newValues[field as keyof ValuesState['values']][obj[field]] ?? 0) + 1
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
        if (process.env.DEV) {
          console.log(
            deepDiffMap(
              this.values[field as keyof ValuesState['values']],
              newValues[field as keyof ValuesState['values']],
            ),
          )
        }
        // overwrite old values in the store
        this.values[field as keyof ValuesState['values']] = {
          ...newValues[field as keyof ValuesState['values']],
        }
        notify({
          message: `Values for ${field} updated`,
          actions: [{ icon: 'close' }],
          timeout: 0,
          group: 'build',
        })
      })
      await setBatch.commit()

      notify({ message: `All done`, actions: [{ icon: 'close' }], timeout: 0, group: 'build' })
    },

    /**
     * Updates the counters in the database and store for a given photo.
     * This is used when a photo is added or removed from the database.
     * @param {PhotoType} oldData - The old data of the photo.
     * @param {1 | -1} delta - 1 if the photo was added, -1 if it was removed.
     * @return {Promise<void>} A promise that resolves when the counters have been updated.
     */
    async updateValues(oldData: PhotoType, delta: 1 | -1): Promise<void> {
      for (const field of CONFIG.photo_filter) {
        const fieldValue = oldData[field as keyof PhotoType]
        if (fieldValue) {
          if (field === 'tags') {
            for (const tag of fieldValue as string[]) {
              const id = counterId(field, tag)
              await this.update(id, field, tag, delta)
            }
          } else {
            const id = counterId(field, fieldValue as string)
            await this.update(id, field as keyof ValuesState['values'], fieldValue as string, delta)
          }
        }
      }
    },

    /**
     * Updates the counter in the database and store for a given value.
     * If the `delta` is positive, the count is increased. If the `delta` is negative, the count is decreased.
     * If the count reaches 0, the counter is removed from the database.
     * If the counter does not exist in the database and the `delta` is positive, the counter is created in the database.
     * @param {string} id - The id of the counter to update.
     * @param {keyof ValuesState['values']} field - The field of the value to update.
     * @param {string} val - The value to update.
     * @param {1 | -1} delta - The delta to apply to the count. 1 to increase, -1 to decrease.
     * @return {Promise<void>} A promise that resolves when the counter has been updated.
     */
    async update(
      id: string,
      field: keyof ValuesState['values'],
      val: string,
      delta: 1 | -1,
    ): Promise<void> {
      // in memory store first
      this.values[field][val] = (this.values[field][val] ?? 0) + delta
      // then in database
      const counterRef = doc(db, 'Counter', id)
      const findDoc = await getDoc(counterRef)
      let newCount = 1
      if (findDoc.exists()) {
        const oldCount = findDoc.data().count
        newCount = oldCount + delta
        if (newCount <= 0) {
          await deleteDoc(counterRef)
        } else {
          await updateDoc(counterRef, {
            count: newCount,
          })
        }
      } else if (delta > 0) {
        await setDoc(counterRef, {
          count: newCount,
          field,
          value: val,
        })
      }
      if (process.env.DEV) {
        console.log(`${delta > 0 ? 'increase' : 'decrease'} ${id}`, newCount)
      }
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
      querySnapshot.forEach(async (d) => {
        const obj = d.data()
        if (obj.count <= 0) {
          try {
            id = counterId('tags', obj.value)
            counterRef = doc(db, 'Counter', id)
            await deleteDoc(counterRef)
          } finally {
            delete this.values.tags[obj.value]
          }
        }
      })
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
     * Adds a new field to the values store.
     *
     * @param {string} val - The value to add to the field.
     * @param {keyof ValuesState['values']} field - The field to add the value to.
     */
    addNewField(val: string, field: keyof ValuesState['values']) {
      this.values[field][val] = 0
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useValuesStore, import.meta.hot))
}
