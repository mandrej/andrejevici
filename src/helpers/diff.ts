/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable  @typescript-eslint/no-explicit-any */

export const deepDiffMapper = (() => {
  const VALUE_CREATED = 'created'
  const VALUE_UPDATED = 'updated'
  const VALUE_DELETED = 'deleted'
  const VALUE_UNCHANGED = 'unchanged'

  const isFunction = (x: any): x is Function =>
    Object.prototype.toString.call(x) === '[object Function]'
  const isArray = (x: any): x is Array<any> =>
    Object.prototype.toString.call(x) === '[object Array]'
  const isDate = (x: any): x is Date => Object.prototype.toString.call(x) === '[object Date]'
  const isObject = (x: any): x is object => Object.prototype.toString.call(x) === '[object Object]'
  const isValue = (x: any): boolean => !isObject(x) && !isArray(x)

  const compareValues = (value1: any, value2: any): string => {
    if (value1 === value2) {
      return VALUE_UNCHANGED
    }
    if (isDate(value1) && isDate(value2) && value1.getTime() === value2.getTime()) {
      return VALUE_UNCHANGED
    }
    if (value1 === undefined) {
      return VALUE_CREATED
    }
    if (value2 === undefined) {
      return VALUE_DELETED
    }
    return VALUE_UPDATED
  }

  const map = (obj1: any, obj2: any): any => {
    if (isFunction(obj1) || isFunction(obj2)) {
      throw new Error('Invalid argument. Function given, object expected.')
    }
    if (isValue(obj1) || isValue(obj2)) {
      return {
        type: compareValues(obj1, obj2),
        data: obj1 === undefined ? obj2 : obj1,
      }
    }

    const diff: any = {}
    for (const key in obj1) {
      if (isFunction(obj1[key])) {
        continue
      }

      const value2 = obj2 ? obj2[key] : undefined
      diff[key] = map(obj1[key], value2)
    }
    for (const key in obj2) {
      if (isFunction(obj2[key]) || diff[key] !== undefined) {
        continue
      }

      diff[key] = map(undefined, obj2[key])
    }

    return diff
  }

  return {
    VALUE_CREATED,
    VALUE_UPDATED,
    VALUE_DELETED,
    VALUE_UNCHANGED,
    map,
    compareValues,
    isFunction,
    isArray,
    isDate,
    isObject,
    isValue,
  }
})()
