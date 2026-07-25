import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createValuesSlice } from './values/createValuesSlice'
import { createCountersSlice } from './values/createCountersSlice'
import type { ValuesStore } from './values/types'

export type { ValuesStore }

export const useValuesStore = create<ValuesStore>()(
  persist(
    (...a) => ({
      ...createValuesSlice(...a),
      ...createCountersSlice(...a),
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

export {
  selectTagsValues,
  selectModelValues,
  selectLensValues,
  selectEmailValues,
  selectNickValues,
  selectKindValues,
  selectYearValues,
  selectNickWithCount,
  selectAllSuggestions,
} from './values/selectors'
