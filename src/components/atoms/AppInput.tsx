import React from 'react'
import AppIcon from '@/components/atoms/AppIcon'

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  modelValue?: string | number | null
  label?: string
  hint?: string
  placeholder?: string
  type?: string
  readonly?: boolean
  disabled?: boolean
  clearable?: boolean
  loading?: boolean
  required?: boolean
  autofocus?: boolean
  error?: string
  step?: string | number
  onChangeValue?: (val: string) => void
}

export const AppInput: React.FC<AppInputProps> = ({
  modelValue = '',
  label,
  hint,
  placeholder,
  type = 'text',
  readonly = false,
  disabled = false,
  clearable = false,
  loading = false,
  required = false,
  autofocus = false,
  error,
  step,
  onChangeValue,
  className = '',
  ...props
}) => {
  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChangeValue) {
      onChangeValue(e.target.value)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (onChangeValue) {
      onChangeValue('')
    }
  }

  return (
    <label
      className={`relative flex flex-col gap-1 w-full ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
    >
      {label && (
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      )}

      <div
        className={`relative flex items-center w-full rounded-lg border transition-colors ${
          readonly
            ? 'bg-gray-55 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent'
        } ${error ? 'border-negative focus-within:ring-negative' : ''}`}
      >
        <input
          type={type}
          value={modelValue ?? ''}
          placeholder={placeholder}
          readOnly={readonly}
          disabled={disabled}
          required={required}
          autoFocus={autofocus}
          step={step}
          className={`flex-1 min-w-0 px-3 py-2 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none rounded-lg dark:scheme-dark [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-90 [&::-webkit-calendar-picker-indicator]:transition-opacity ${
            readonly ? 'cursor-default text-gray-500 dark:text-gray-400' : ''
          }`}
          onChange={onInput}
          {...props}
        />

        {loading && (
          <span className="px-2 text-primary flex items-center justify-center shrink-0">
            <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </span>
        )}

        {clearable && modelValue && !readonly && !loading && (
          <button
            type="button"
            tabIndex={-1}
            className="px-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
            onClick={handleClear}
          >
            <AppIcon name="close" className="w-5 h-5" />
          </button>
        )}
      </div>

      {hint && !error && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{hint}</span>
      )}
      {error && <span className="text-[10px] text-negative">{error}</span>}
    </label>
  )
}

export default AppInput
