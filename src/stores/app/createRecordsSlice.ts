import type { StateCreator } from 'zustand'
import { doc, query, where, limit, orderBy, getDoc, getDocs, startAfter } from 'firebase/firestore'
import type {
  QuerySnapshot,
  DocumentSnapshot,
  QueryConstraint,
  QueryFieldFilterConstraint,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { sliceSlug, fixQuery } from '@/helpers'
import CONFIG from '@/config'
import type { PhotoType } from '@/helpers/models'
import { photoCollection } from '@/helpers/collections'
import type { AppStore, RecordsSliceState, RecordsSliceActions } from '@/stores/app/types'

const includeSub = <T>(arr: T[], target: T[]): boolean => target.every((v) => arr.includes(v))

export const createRecordsSlice: StateCreator<
  AppStore,
  [],
  [],
  RecordsSliceState & RecordsSliceActions
> = (set, get) => ({
  find: {},
  objects: [],
  next: '',
  selected: [],

  setSelected: (selected) =>
    set((state) => ({
      selected: typeof selected === 'function' ? selected(state.selected) : selected,
    })),

  searchBy: (criteria, onNavigate) => {
    const queryCleaned = fixQuery(criteria)
    set({ find: queryCleaned })
    void get().fetchRecords(true)
    if (onNavigate) onNavigate()
  },

  fetchPhoto: async (filename) => {
    const existing = get().objects.find((x) => x.filename === filename)
    if (existing) return existing

    try {
      const docRef = doc(photoCollection, filename)
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? (docSnap.data() as PhotoType) : null
    } catch (err) {
      console.error('Failed to fetch photo:', err)
      return null
    }
  },

  fetchRecords: async (reset = false) => {
    if (get().busy) return

    const findCriteria = get().find
    const max =
      CONFIG.limit *
      (findCriteria?.tags ? findCriteria.tags.length + 2 : 1) *
      (findCriteria?.text ? sliceSlug(findCriteria.text).length : 1)

    const filters: QueryFieldFilterConstraint[] = Object.entries(findCriteria || {}).map(
      ([key, val]) => {
        if (key === 'tags') {
          return where(key, 'array-contains-any', val)
        } else if (key === 'text') {
          return where(key, 'array-contains-any', sliceSlug(val as string))
        } else {
          return where(key, '==', val)
        }
      },
    )

    const constraints: Array<QueryConstraint> = [...filters, orderBy('date', 'desc')]
    set({ busy: true })

    let currentNext = reset ? '' : get().next
    if (reset) {
      set({ next: '' })
    }

    if (currentNext !== '') {
      const cursor: DocumentSnapshot = await getDoc(doc(photoCollection, currentNext))
      constraints.push(startAfter(cursor))
    }
    constraints.push(limit(max))

    try {
      const querySnapshot: QuerySnapshot = await getDocs(query(photoCollection, ...constraints))
      const currentObjects = reset ? [] : [...get().objects]
      const existingIds = new Set(currentObjects.map((x) => x.filename))

      querySnapshot.forEach((d: QueryDocumentSnapshot) => {
        const data = d.data() as PhotoType
        if (!existingIds.has(data.filename)) {
          currentObjects.push(data)
        }
      })

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1]
      const nextVal = querySnapshot.docs.length < max ? '' : lastDoc?.id || ''

      let filteredObjects = currentObjects
      if (findCriteria?.tags) {
        filteredObjects = filteredObjects.filter((d) =>
          includeSub(d.tags as string[], findCriteria.tags as string[]),
        )
      }
      if (findCriteria?.text) {
        filteredObjects = filteredObjects.filter((d) =>
          includeSub(d.text as string[], sliceSlug(findCriteria.text || '')),
        )
      }

      set({
        objects: filteredObjects,
        next: nextVal,
        error: filteredObjects.length === 0 ? 'empty' : '',
        busy: false,
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('FETCH ' + JSON.stringify(findCriteria, null, 2) + ' with next: ' + nextVal)
      }

      return { objects: filteredObjects, error: null, next: nextVal }
    } catch (err) {
      const errMsg = (err as Error).message
      set({ error: errMsg, busy: false })
      return { objects: [], error: errMsg, next: '' }
    }
  },
})
