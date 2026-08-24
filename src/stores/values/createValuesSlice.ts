import type { StateCreator } from 'zustand'
import { db } from '@/firebase'
import { query, getDocs, where, doc, setDoc, writeBatch } from 'firebase/firestore'
import CONFIG from '@/config'
import { counterCollection, photoCollection, renameCollection } from '@/helpers/collections'
import { counterId } from '@/helpers'
import type { ValuesState } from '@/helpers/models'
import type { ValuesStore, ValuesSliceState, ValuesSliceActions } from '@/stores/values/types'

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

export const createValuesSlice: StateCreator<
  ValuesStore,
  [],
  [],
  ValuesSliceState & ValuesSliceActions
> = (set) => ({
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

  addNewValue: (inputValue, field, done) => {
    set((state) => {
      const updatedValues = { ...state.values }
      updatedValues[field] = { ...updatedValues[field], [inputValue]: 0 }
      return { values: updatedValues }
    })
    done(inputValue)
  },

  addValue: async (field, value) => {
    const id = counterId(field, value)
    const counterRef = doc(counterCollection, id)
    await setDoc(counterRef, { count: 0, field, value })

    set((state) => {
      const nextValues = { ...state.values }
      if (!nextValues[field]) {
        nextValues[field] = {}
      }
      nextValues[field] = {
        ...nextValues[field],
        [value]: 0,
      }
      return { values: nextValues }
    })
  },

  deleteValue: async (field, value) => {
    const filter =
      field === 'tags' ? where(field, 'array-contains', value) : where(field, '==', value)
    const querySnapshot = await getDocs(query(photoCollection, filter))

    const updates: Array<{ id: string; data: Record<string, unknown> }> = []
    querySnapshot.forEach((d) => {
      const obj = d.data()
      if (field === 'tags' && Array.isArray(obj.tags)) {
        updates.push({ id: d.id, data: { tags: obj.tags.filter((t: string) => t !== value) } })
      } else if (field !== 'tags') {
        updates.push({ id: d.id, data: { [field]: '' } })
      }
    })

    await commitInBatches(updates, (batch, { id, data }) => {
      batch.update(doc(photoCollection, id), data)
    })
  },

  renameValue: async (field, oldValue, newValue) => {
    const filter =
      field === 'tags' ? where(field, 'array-contains-any', [oldValue]) : where(field, '==', oldValue)
    const querySnapshot = await getDocs(query(photoCollection, filter))

    type BatchOp =
      | { type: 'set'; id: string; data: Record<string, unknown>; merge?: boolean }
      | { type: 'update'; id: string; data: Record<string, unknown> }

    const ops: BatchOp[] = []

    if (field === 'lens' || field === 'model') {
      ops.push({
        type: 'set',
        id: oldValue,
        data: { newValue, field },
        merge: true,
      })
    }

    querySnapshot.forEach((d) => {
      if (field === 'tags') {
        const obj = d.data()
        if (Array.isArray(obj.tags)) {
          const idx = obj.tags.indexOf(oldValue)
          if (idx > -1) {
            const updatedTags = [...obj.tags]
            if (updatedTags.includes(newValue)) {
              updatedTags.splice(idx, 1)
            } else {
              updatedTags.splice(idx, 1, newValue)
            }
            ops.push({ type: 'update', id: d.id, data: { [field]: updatedTags } })
          }
        }
      } else {
        ops.push({ type: 'update', id: d.id, data: { [field]: newValue } })
      }
    })

    await commitInBatches(ops, (batch, op) => {
      if (op.type === 'set') {
        batch.set(doc(renameCollection, op.id), op.data, { merge: op.merge ?? false })
      } else {
        batch.update(doc(photoCollection, op.id), op.data)
      }
    })
  },
})
