import React from 'react'
import AppCombobox from '@/components/atoms/AppCombobox'

interface AutoCompleteProps {
  modelValue?: string | string[] | null
  options: string[]
  multiple?: boolean
  canadd?: boolean
  clearable?: boolean
  required?: boolean
  error?: string
  label: string
  hint?: string
  placement?: 'top' | 'bottom'
  onChange?: (val: string | string[] | null) => void
  onNewValue?: (value: string, done: (val: string) => void) => void
}

export const AutoComplete: React.FC<AutoCompleteProps> = ({
  modelValue = '',
  options,
  multiple = false,
  canadd = false,
  clearable = true,
  required = false,
  error,
  label,
  hint = '',
  placement = 'bottom',
  onChange,
  onNewValue,
}) => {
  const handleUpdate = (val: string | string[] | null) => {
    if (onChange) {
      onChange(val === null ? (multiple ? [] : '') : val)
    }
  }

  return (
    <AppCombobox
      modelValue={modelValue}
      onChange={handleUpdate}
      options={options}
      label={label}
      hint={hint}
      multiple={multiple}
      clearable={clearable}
      required={required}
      error={error}
      canadd={canadd}
      placement={placement}
      onNewValue={onNewValue}
    />
  )
}

export default AutoComplete
