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
import { CONFIG, emailNick } from '../helpers'
import type { DocumentReference } from 'firebase/firestore'
import type { StoredItem } from '../components/models'
interface ValuesState {
  tagsToApply: string[]
  values: {
    year: { [key: string]: number }
    tags: { [key: string]: number }
    model: { [key: string]: number }
    lens: { [key: string]: number }
    email: { [key: string]: number }
  }
}

const photosCol = collection(db, 'Photo')
const countersCol = collection(db, 'Counter')

const counterId = (field: string, value: string): string => {
  return ['Photo', field, value].join('||')
}

const byCountReverse = <T extends keyof ValuesState['values']>(
  state: ValuesState,
  field: T,
): { [key: string]: number } => {
  return Object.entries(state.values[field])
    .sort(([, a], [, b]) => b - a)
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {}) as { [key: string]: number }
}

export const useValuesStore = defineStore('meta', {
  state: () => ({
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
    nickValues: (state: ValuesState) => {
      const ret: string[] = []
      const emails = byCountReverse(state, 'email')
      Object.keys(emails).forEach((key) => {
        ret.push(emailNick(key))
      })
      return ret
    },
    yearValues: (state: ValuesState) => {
      return Object.keys(state.values.year).reverse()
    },
    // withCount
    yearWithCount: (state: ValuesState): Array<{ value: string; count: number }> => {
      const ret: Array<{ value: string; count: number }> = []
      for (const year of Object.keys(state.values.year).reverse()) {
        ret.push({ value: year, count: state.values.year[year] })
      }
      return ret
    },
    nickWithCount: (state: ValuesState): { [key: string]: number } => {
      const emails = byCountReverse(state, 'email')
      return Object.keys(emails)
        .filter((key): key is string => emails[key]! > 0)
        .reduce(
          (obj, key): { [key: string]: number } => {
            obj[emailNick(key)] = emails[key]!
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
            newValues[field][obj[field]] = (newValues[field][obj[field]] ?? 0) + 1
          }
        })
      })

      // Write new counters to database and store
      const setBatch = writeBatch(db)
      CONFIG.photo_filter.forEach((field) => {
        Object.entries(newValues[field]).forEach(([key, count]) => {
          const counterRef = doc(db, 'Counter', counterId(field, key))
          setBatch.set(counterRef, { count, field, value: key })
        })
        this.values[field] = { ...newValues[field] }
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
    async increase(id, field, val) {
      let find = this.values[field][val]
      if (find) {
        find++
      } else {
        this.values[field][val] = 1
      }

      const counterRef = doc(db, 'Counter', id)
      const oldDoc = await getDoc(counterRef)
      if (oldDoc.exists()) {
        const old = oldDoc.data()
        await updateDoc(counterRef, {
          count: old.count + 1,
        })
      } else {
        await setDoc(
          counterRef,
          {
            count: 1,
            field: field,
            value: val,
          },
          { merge: true },
        )
      }
      if (process.env.DEV) console.log('increase ' + id, this.values[field][val])
    },
    async increaseValues(newData) {
      for (const field of CONFIG.photo_filter) {
        if (newData[field] && newData.date) {
          if (field === 'tags') {
            for (const tag of newData[field]) {
              const id = counterId(field, tag)
              this.increase(id, field, tag)
            }
          } else {
            const id = counterId(field, newData[field])
            this.increase(id, field, '' + newData[field])
          }
        }
      }
    },
    async decrease(id, field, val) {
      let find = this.values[field][val]
      if (find) {
        find--
        if (find <= 0) {
          delete this.values[field][val]
        }
      }

      const counterRef = doc(db, 'Counter', id)
      const oldDoc = await getDoc(counterRef)
      if (oldDoc.exists()) {
        const old = oldDoc.data()
        if (old.count - 1 <= 0) {
          await deleteDoc(counterRef)
        } else {
          await updateDoc(counterRef, {
            count: old.count - 1,
          })
        }
        if (process.env.DEV) console.log('decrease ' + id, this.values[field][val])
      }
    },
    async decreaseValues(oldData) {
      for (const field of CONFIG.photo_filter) {
        if (oldData[field]) {
          if (field === 'tags') {
            for (const tag of oldData[field]) {
              const id = counterId(field, tag)
              this.decrease(id, field, tag)
            }
          } else {
            const id = counterId(field, oldData[field])
            this.decrease(id, field, '' + oldData[field])
          }
        }
      }
    },
    async removeUnusedTags() {
      // delete from store
      let id, counterRef
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
    async renameValue(field, oldValue, newValue) {
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
    },
    addNewField(val, field) {
      this.values[field][val] = 1
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useValuesStore, import.meta.hot))
}
