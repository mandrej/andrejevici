import React from 'react'
import AppIcon from '@/components/atoms/AppIcon'

interface LocalSearchProps {
  modelValue: string
  label?: string
  options?: string[]
  onChangeValue?: (val: string) => void
}

export const LocalSearch: React.FC<LocalSearchProps> = ({
  modelValue,
  label = 'Search',
  options = [],
  onChangeValue,
}) => {
  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChangeValue) {
      onChangeValue(e.target.value)
    }
  }

  const onClear = () => {
    if (onChangeValue) {
      onChangeValue('')
    }
  }

  return (
    <div className="relative flex items-center w-full">
      <AppIcon
        name="search"
        className="absolute left-3 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none"
      />
      <input
        type="text"
        value={modelValue}
        placeholder={label}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 pl-9 pr-9 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors placeholder-gray-400"
        onChange={onInput}
        list="local-search-options"
      />
      <datalist id="local-search-options">
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>

      {modelValue && (
        <button
          type="button"
          className="absolute right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={onClear}
        >
          <AppIcon name="close" className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export default LocalSearch
