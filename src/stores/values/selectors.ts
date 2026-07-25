import { months } from '../../helpers'
import type { ValuesState, Suggestion } from '../../helpers/models'
import type { ValuesStore } from './types'

const byCountReverse = (
  values: ValuesState['values'],
  field: keyof ValuesState['values'],
): Record<string, number> => {
  return Object.fromEntries(
    Object.entries(values[field] || {})
      .sort(([, a], [, b]) => b - a)
      .filter(([, v]) => v > 0),
  )
}

const sortByCountReverse = (
  values: ValuesState['values'],
  field: keyof ValuesState['values'],
): string[] => Object.keys(byCountReverse(values, field))

const makeSuggestion = (field: string, value: string, count?: number): Suggestion => ({
  key: `${field}-${value}`,
  field: field === 'nick' ? 'author' : field,
  value,
  ...(count !== undefined && { count }),
})

let lastValues: any = null
const cache = {
  tags: null as any,
  model: null as any,
  lens: null as any,
  email: null as any,
  nick: null as any,
  kind: null as any,
  year: null as any,
  nickWithCount: null as any,
  suggestions: null as any,
}

const checkCache = (values: any) => {
  if (values !== lastValues) {
    lastValues = values
    cache.tags = Object.keys(values.tags || {}).sort()
    cache.model = sortByCountReverse(values, 'model')
    cache.lens = sortByCountReverse(values, 'lens')
    cache.email = sortByCountReverse(values, 'email')
    cache.nick = sortByCountReverse(values, 'nick')
    cache.kind = sortByCountReverse(values, 'kind')
    cache.year = Object.keys(values.year || {}).reverse()
    cache.nickWithCount = byCountReverse(values, 'nick')

    const suggestions: Suggestion[] = []
    const countedFields = [
      { field: 'kind', values: cache.kind },
      { field: 'nick', values: cache.nick },
      { field: 'tags', values: cache.tags },
      { field: 'year', values: cache.year },
      { field: 'model', values: cache.model },
      { field: 'lens', values: cache.lens },
    ] as const

    for (const { field, values: fieldValues } of countedFields) {
      for (const value of fieldValues) {
        suggestions.push(makeSuggestion(field, value, values[field][value]))
      }
    }

    months.forEach((month, index) => {
      suggestions.push({ key: `month-${index + 1}`, field: 'month', value: month })
    })

    for (let i = 1; i <= 31; i++) {
      suggestions.push({ key: `day-${i}`, field: 'day', value: i.toString() })
    }

    cache.suggestions = suggestions
  }
}

export const selectTagsValues = (state: ValuesStore) => {
  checkCache(state.values)
  return cache.tags
}
export const selectModelValues = (state: ValuesStore) => {
  checkCache(state.values)
  return cache.model
}
export const selectLensValues = (state: ValuesStore) => {
  checkCache(state.values)
  return cache.lens
}
export const selectEmailValues = (state: ValuesStore) => {
  checkCache(state.values)
  return cache.email
}
export const selectNickValues = (state: ValuesStore) => {
  checkCache(state.values)
  return cache.nick
}
export const selectKindValues = (state: ValuesStore) => {
  checkCache(state.values)
  return cache.kind
}
export const selectYearValues = (state: ValuesStore) => {
  checkCache(state.values)
  return cache.year
}
export const selectNickWithCount = (state: ValuesStore) => {
  checkCache(state.values)
  return cache.nickWithCount
}

export const selectAllSuggestions = (state: ValuesStore): Suggestion[] => {
  checkCache(state.values)
  return cache.suggestions
}
