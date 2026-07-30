import React from 'react'
import AppCombobox from './atoms/AppCombobox'

interface AutoCompleteProps {
  modelValue?: string | string[] | null
  options: string[]
  multiple?: boolean
  canadd?: boolean
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
      clearable
      canadd={canadd}
      placement={placement}
      onNewValue={onNewValue}
    />
  )
}

export default AutoComplete
