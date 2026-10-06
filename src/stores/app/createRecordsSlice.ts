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
import type {
  AppStore,
  RecordsSliceState,
  RecordsSliceActions,
  FetchRecordsResult,
} from '@/stores/app/types'

const includeSub = <T>(arr: T[], target: T[]): boolean => target.every((v) => arr.includes(v))

/** Stable signature of the active filter, used to detect equivalent requests. */
const findSignature = (find: RecordsSliceState['find']): string =>
  JSON.stringify(Object.entries(find ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))

export const createRecordsSlice: StateCreator<
  AppStore,
  [],
  [],
  RecordsSliceState & RecordsSliceActions
> = (set, get) => {
  // Concurrent callers (mount, filter change, infinite scroll, publish) are queued
  // and identical in-flight requests are shared. The previous `if (busy) return`
  // dropped callers silently, which made the gallery treat a page as the end of the
  // list and stop loading more.
  let inflight: { key: string; promise: Promise<FetchRecordsResult> } | null = null

  const runFetch = async (reset: boolean): Promise<FetchRecordsResult> => {
    const findCriteria = get().find
    // Read the cursor before the reset clears it, so a queued load-more continues
    // after the newest page instead of refetching the first one.
    const currentNext = reset ? '' : get().next

    // Every path below is guarded: a failure must always release `busy`, otherwise
    // all later loads are skipped and the list never grows again.
    set(reset ? { busy: true, next: '' } : { busy: true })

    try {
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

      if (currentNext !== '') {
        const cursor: DocumentSnapshot = await getDoc(doc(photoCollection, currentNext))
        constraints.push(startAfter(cursor))
      }
      constraints.push(limit(max))

      const querySnapshot: QuerySnapshot = await getDocs(query(photoCollection, ...constraints))
      const currentObjects = reset ? [] : [...get().objects]
      const existingIds = new Set(currentObjects.map((x) => x.id))

      querySnapshot.forEach((d: QueryDocumentSnapshot) => {
        const raw = d.data() as PhotoType
        const data: PhotoType = {
          ...raw,
          id: d.id,
        }
        if (!existingIds.has(data.id)) {
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
        // Only "empty" when the query is exhausted — a fully filtered page must not
        // look like the end of the list, otherwise loading stops while pages remain.
        error: nextVal === '' && filteredObjects.length === 0 ? 'empty' : '',
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('FETCH ' + JSON.stringify(findCriteria, null, 2) + ' with next: ' + nextVal)
      }

      return { objects: filteredObjects, error: null, next: nextVal }
    } catch (err) {
      // Cursor resolution and the query share the error path, so `busy` is always
      // released and the list cannot get stuck in a permanent loading state.
      const errMsg = (err as Error).message
      set({ error: errMsg })
      return { objects: get().objects, error: errMsg, next: get().next }
    } finally {
      set({ busy: false })
    }
  }

  return {
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

    fetchPhoto: async (id) => {
      const existing = get().objects.find((x) => x.id === id)
      if (existing) return existing

      try {
        const docRef = doc(photoCollection, id)
        const docSnap = await getDoc(docRef)
        if (!docSnap.exists()) return null
        const raw = docSnap.data() as PhotoType
        return {
          ...raw,
          id: docSnap.id,
        } as PhotoType
      } catch (err) {
        console.error('Failed to fetch photo:', err)
        return null
      }
    },

    fetchRecords: async (reset = false) => {
      const findSig = findSignature(get().find)
      const key = reset ? `reset:${findSig}` : `more:${findSig}:${get().next}`

      if (inflight) {
        if (inflight.key === key) return inflight.promise
        try {
          await inflight.promise
        } catch {
          // runFetch reports failures through its result, never by rejecting.
        }
      }

      const startKey = reset ? `reset:${findSig}` : `more:${findSig}:${get().next}`
      const promise = runFetch(reset)
      inflight = { key: startKey, promise }
      try {
        return await promise
      } finally {
        if (inflight?.promise === promise) inflight = null
      }
    },
  }
}
