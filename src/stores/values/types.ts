import type { ValuesState, PhotoType } from '@/helpers/models'

export interface ValuesSliceState extends ValuesState {}

export interface ValuesSliceActions {
  fetchValues: () => Promise<void>
  addNewValue: (
    inputValue: string,
    field: keyof ValuesState['values'],
    done: (value: string) => void,
  ) => void
  addValue: (field: keyof ValuesState['values'], value: string) => Promise<void>
  deleteValue: (field: keyof ValuesState['values'], value: string) => Promise<void>
  renameValue: (
    field: keyof ValuesState['values'],
    oldValue: string,
    newValue: string,
  ) => Promise<void>
}

export interface CountersSliceActions {
  countersBuild: (targetField?: string) => Promise<void>
  buildCounterObject: (data: PhotoType) => Record<string, number>
  updateCounters: (oldData: PhotoType | null, newData: PhotoType | null) => void
  batchUpdateCounters: (toAdd: string[], toRemove: string[]) => Promise<void>
}

export type ValuesStore = ValuesSliceState & ValuesSliceActions & CountersSliceActions
