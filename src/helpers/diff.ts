/* eslint-disable @typescript-eslint/no-explicit-any */
export const VALUE_CREATED = 'created'
export const VALUE_UPDATED = 'updated'
export const VALUE_DELETED = 'deleted'
export const VALUE_UNCHANGED = 'unchanged'

function isValue(x: any): boolean {
  return typeof x !== 'object' || x === null
}

function isDate(x: any): x is Date {
  return x instanceof Date
}

function compareValues(value1: any, value2: any): string {
  if (value1 === value2) return VALUE_UNCHANGED
  if (isDate(value1) && isDate(value2) && value1.getTime() === value2.getTime())
    return VALUE_UNCHANGED
  if (value1 === undefined) return VALUE_CREATED
  if (value2 === undefined) return VALUE_DELETED
  return VALUE_UPDATED
}

export type DiffResult = {
  key: string
  status: string
  value: any
}

export function deepDiffMap(obj1: any, obj2: any): DiffResult[] {
  const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})])
  const result: DiffResult[] = []
  for (const key of keys) {
    const val1 = obj1 ? obj1[key] : undefined
    const val2 = obj2 ? obj2[key] : undefined
    const status = compareValues(val1, val2)
    let value: any
    if (!isValue(val1) && !isValue(val2)) {
      value = deepDiffMap(val1, val2)
    } else {
      value = val1 === undefined ? val2 : val1
    }
    if (status === VALUE_UNCHANGED) continue
    result.push({ key, status, value })
  }
  return result
}
