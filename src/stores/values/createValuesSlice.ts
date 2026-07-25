import type { StateCreator } from 'zustand'
import { query, getDocs } from 'firebase/firestore'
import CONFIG from '../../config'
import { counterCollection } from '../../helpers/collections'
import type { ValuesState } from '../../helpers/models'
import type { ValuesStore, ValuesSliceState, ValuesSliceActions } from './types'

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
})
