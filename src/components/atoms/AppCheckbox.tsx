import React from 'react'
import AppIcon from '@/components/atoms/AppIcon'

interface AppCheckboxProps {
  modelValue?: boolean | unknown[]
  val?: unknown
  label?: string
  disabled?: boolean
  onChange?: (val: boolean | unknown[]) => void
  className?: string
}

export const AppCheckbox: React.FC<AppCheckboxProps> = ({
  modelValue,
  val,
  label,
  disabled = false,
  onChange,
  className = '',
}) => {
  const isChecked = React.useMemo(() => {
    if (Array.isArray(modelValue)) {
      return modelValue.includes(val)
    }
    return !!modelValue
  }, [modelValue, val])

  const toggle = () => {
    if (disabled || !onChange) return

    if (Array.isArray(modelValue)) {
      const arr = [...modelValue]
      const idx = arr.indexOf(val)
      if (idx === -1) {
        arr.push(val)
      } else {
        arr.splice(idx, 1)
      }
      onChange(arr)
    } else {
      onChange(!modelValue)
    }
  }

  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isChecked}
          disabled={disabled}
          onChange={toggle}
        />
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 ${
            isChecked
              ? 'bg-primary border-primary'
              : 'bg-transparent border-gray-300 dark:border-gray-300'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary'}`}
        >
          {isChecked && <AppIcon name="check" className="w-4 h-4 text-white" />}
        </div>
      </div>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  )
}

export default AppCheckbox
