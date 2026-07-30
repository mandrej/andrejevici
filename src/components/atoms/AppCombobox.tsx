import React, { useState, useMemo } from 'react'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  Transition,
} from '@headlessui/react'
import AppIcon from './AppIcon'

interface AppComboboxProps {
  modelValue?: string | string[] | null
  options: string[]
  label?: string
  hint?: string
  placeholder?: string
  multiple?: boolean
  clearable?: boolean
  canadd?: boolean
  placement?: 'top' | 'bottom'
  onChange?: (val: string | string[] | null) => void
  onNewValue?: (value: string, done: (val: string) => void) => void
}

export const AppCombobox: React.FC<AppComboboxProps> = ({
  modelValue = null,
  options,
  label,
  hint,
  placeholder,
  multiple = false,
  clearable = true,
  canadd = false,
  placement = 'bottom',
  onChange,
  onNewValue,
}) => {
  const [query, setQuery] = useState('')

  const isTagsInput = useMemo(() => {
    return label?.toLowerCase().includes('tags') ?? false
  }, [label])

  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, query])

  const onUpdate = (val: any) => {
    if (!onChange) return

    if (multiple) {
      const arr = Array.isArray(val) ? val : [val]
      const unique = Array.from(new Set(arr)).filter(Boolean) as string[]
      onChange(unique)
    } else {
      onChange(val as string | null)
    }
    setQuery('')
  }

  const removeItem = (item: string) => {
    if (!onChange || !Array.isArray(modelValue)) return
    onChange(modelValue.filter((v) => v !== item))
  }

  const onClear = () => {
    if (onChange) {
      onChange(multiple ? [] : null)
    }
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canadd && query.length > 0 && filteredOptions.length === 0) {
      e.preventDefault()
      const done = (value: string) => {
        if (!onChange) return
        if (multiple) {
          const arr = Array.isArray(modelValue) ? [...modelValue] : []
          if (!arr.includes(value)) arr.push(value)
          onChange(arr)
        } else {
          onChange(value)
        }
      }

      if (onNewValue) {
        onNewValue(query, done)
      } else {
        done(query)
      }
      setQuery('')
    }
  }

  const displayVal = useMemo(() => {
    if (multiple) return query
    return String(modelValue ?? '')
  }, [multiple, query, modelValue])

  const hasValue = multiple ? Array.isArray(modelValue) && modelValue.length > 0 : !!modelValue

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      )}

      <Combobox value={modelValue} onChange={onUpdate} multiple={multiple as any}>
        <div className="relative">
          {/* Multi-value chips + input row */}
          <div className="flex flex-wrap gap-1 min-h-[38px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-colors">
            {/* Selected chips (multiple mode) */}
            {multiple && Array.isArray(modelValue) && (
              <>
                {modelValue.map((item) => (
                  <span
                    key={String(item)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                      isTagsInput
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {item}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeItem(item)
                      }}
                      className="hover:text-red-500 transition-colors"
                    >
                      <AppIcon name="close" className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </>
            )}

            <ComboboxInput
              className="flex-1 min-w-[80px] bg-transparent text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
              placeholder={placeholder}
              value={displayVal}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
            />

            {/* Dropdown toggle button (only in single-select) */}
            {!multiple && (
              <ComboboxButton className="absolute right-2 top-1/2 -translate-y-1/2">
                <AppIcon name="unfold_more" className="w-5 h-5 text-gray-400" />
              </ComboboxButton>
            )}

            {clearable && hasValue && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors ${
                  multiple ? 'right-2' : 'right-7'
                }`}
              >
                <AppIcon name="close" className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Dropdown */}
          <Transition
            enter="transition ease-out duration-100"
            enterFrom={placement === 'top' ? 'opacity-0 -translate-y-1' : 'opacity-0 translate-y-1'}
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            {(filteredOptions.length > 0 || (canadd && query.length > 0)) && (
              <ComboboxOptions
                className={`absolute z-50 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl py-1 focus:outline-none ${
                  placement === 'top' ? 'bottom-full mb-1' : 'mt-1'
                }`}
              >
                {/* Add new option */}
                {canadd && query.length > 1 && !filteredOptions.includes(query) && (
                  <ComboboxOption value={query}>
                    {({ focus }) => (
                      <li
                        className={`px-4 py-2 text-sm cursor-pointer flex items-center gap-2 ${
                          focus ? 'bg-primary/10 text-primary' : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <AppIcon name="add" className="w-4 h-4" />
                        Add "{query}"
                      </li>
                    )}
                  </ComboboxOption>
                )}

                {filteredOptions.map((option) => (
                  <ComboboxOption key={String(option)} value={option}>
                    {({ focus, selected }) => (
                      <li
                        className={`relative cursor-pointer select-none py-2 pl-10 pr-4 text-sm ${
                          focus ? 'bg-primary/10 text-primary' : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <span
                          className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}
                        >
                          {option}
                        </span>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                            <AppIcon name="check" className="w-4 h-4" />
                          </span>
                        )}
                      </li>
                    )}
                  </ComboboxOption>
                ))}
              </ComboboxOptions>
            )}
          </Transition>
        </div>
      </Combobox>

      {hint && <span className="text-[10px] text-gray-400 dark:text-gray-500">{hint}</span>}
    </div>
  )
}

export default AppCombobox
