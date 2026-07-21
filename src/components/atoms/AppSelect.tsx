import React, { useMemo } from 'react'
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,
  Transition,
} from '@headlessui/react'
import AppIcon from './AppIcon'

type ModelValue = string | number | boolean | object | null | undefined

interface SelectOption {
  label?: string
  value?: ModelValue
}

interface AppSelectProps {
  modelValue?: ModelValue
  options: (string | number | SelectOption)[]
  label?: string
  emitValue?: boolean
  mapOptions?: boolean
  flat?: boolean
  onChange?: (val: any) => void
  className?: string
}

const optionValue = (opt: string | number | SelectOption): ModelValue =>
  typeof opt === 'object' && opt !== null && 'value' in opt ? opt.value : opt

const optionLabel = (opt: string | number | SelectOption): string => {
  if (typeof opt === 'object' && opt !== null) {
    return (
      opt.label ??
      (typeof opt.value === 'string' || typeof opt.value === 'number' ? String(opt.value) : '—')
    )
  }
  return String(opt)
}

export const AppSelect: React.FC<AppSelectProps> = ({
  modelValue,
  options,
  label,
  flat = false,
  onChange,
  className = '',
}) => {
  const displayValue = useMemo(() => {
    const found = options.find((o) => optionValue(o) === modelValue)
    if (found) return optionLabel(found)
    return typeof modelValue === 'string' || typeof modelValue === 'number'
      ? String(modelValue)
      : '—'
  }, [options, modelValue])

  return (
    <Listbox value={modelValue} onChange={onChange}>
      <div className={`relative ${className}`}>
        {label && (
          <ListboxLabel className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {label}
          </ListboxLabel>
        )}
        <ListboxButton
          className={`relative w-full cursor-pointer text-left focus:outline-none transition-colors ${
            flat
              ? 'py-0 pr-6 text-lg font-semibold text-gray-900 dark:text-white bg-transparent'
              : 'rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-sm shadow-sm focus:ring-2 focus:ring-primary'
          }`}
        >
          <span className="block truncate">{displayValue}</span>
          <span
            className={`pointer-events-none absolute inset-y-0 right-0 flex items-center ${flat ? '' : 'pr-2'}`}
          >
            <AppIcon name="unfold_more" className="w-5 h-5 text-gray-400" />
          </span>
        </ListboxButton>

        <Transition
          leave="transition duration-100 ease-in"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-1 shadow-xl focus:outline-none">
            {options.map((option, index) => {
              const val = optionValue(option)
              const lbl = optionLabel(option)
              return (
                <ListboxOption key={`${String(val)}-${index}`} value={val}>
                  {({ focus, selected }) => (
                    <li
                      className={`relative cursor-pointer select-none py-2 pl-10 pr-4 text-sm ${
                        focus ? 'bg-primary/10 text-primary' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <span
                        className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}
                      >
                        {lbl}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                          <AppIcon name="check" className="w-4 h-4" />
                        </span>
                      )}
                    </li>
                  )}
                </ListboxOption>
              )
            })}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  )
}

export default AppSelect
