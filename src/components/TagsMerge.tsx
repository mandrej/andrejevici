import React from 'react'
import { useValuesStore, selectTagsValues } from '../stores/valuesStore'
import AutoComplete from './AutoComplete'

interface TagsMergeProps {
  label?: string
  hint?: string
  className?: string
  placement?: 'top' | 'bottom'
}

export const TagsMerge: React.FC<TagsMergeProps> = ({
  label = '',
  hint = '',
  className = '',
  placement = 'bottom',
}) => {
  const meta = useValuesStore()
  const tagsValues = useValuesStore(selectTagsValues)
  const tagsToApply = useValuesStore((state) => state.tagsToApply)

  const handleTagsChange = (val: string | string[] | null) => {
    useValuesStore.setState({ tagsToApply: Array.isArray(val) ? val : [] })
  }

  const handleNewValue = (value: string, done: (val: string) => void) => {
    meta.addNewValue(value, 'tags', done)
  }

  return (
    <div className={className}>
      <AutoComplete
        label={label}
        modelValue={tagsToApply}
        onChange={handleTagsChange}
        options={tagsValues}
        canadd
        multiple
        hint={hint}
        placement={placement}
        onNewValue={handleNewValue}
      />
    </div>
  )
}

export default TagsMerge
