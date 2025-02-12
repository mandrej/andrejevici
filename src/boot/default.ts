import { QInput, QSelect } from 'quasar'
import type { defineComponent } from 'vue'

const setDefault = (component: ReturnType<typeof defineComponent>, key: string, value: unknown) => {
  const prop = component.props?.[key]
  switch (typeof prop) {
    case 'object':
      prop.default = value
      break
    case 'function':
      component.props[key] = {
        type: prop,
        default: value,
      }
      break
    case 'undefined':
      throw new Error('unknown prop: ' + key)
    default:
      throw new Error('unhandled type: ' + typeof prop)
  }
}

setDefault(QInput, 'clearIcon', 'clear')
setDefault(QSelect, 'clearIcon', 'clear')
