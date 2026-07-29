'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { useValuesStore, selectAllSuggestions } from '../stores/valuesStore'
import { months } from '../helpers'
import type { FindType, Suggestion } from '../helpers/models'
import AppIcon from './atoms/AppIcon'

export const GlobalSearch: React.FC = () => {
  const find = useAppStore((state) => state.find)
  const searchBy = useAppStore((state) => state.searchBy)
  const allSuggestions = useValuesStore(selectAllSuggestions)

  const [tmp, setTmp] = useState<FindType>({ ...find })
  const [searchInput, setSearchInput] = useState('')
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep local filter state synced with global find query
  useEffect(() => {
    setTmp({ ...find })
  }, [find])

  const hasActiveFilters = useMemo(() => {
    return Object.keys(tmp).length > 0
  }, [tmp])

  const onInput = (val: string) => {
    setSearchInput(val)
    setActiveIdx(-1)

    if (!val || val.length < 1) {
      setFilteredSuggestions([])
      return
    }

    const lower = val.toLowerCase()
    const colonIdx = lower.indexOf(':')
    let suggestions: Suggestion[] = []

    if (colonIdx > 0) {
      const fieldPart = lower.substring(0, colonIdx).trim()
      const valuePart = lower.substring(colonIdx + 1).trim()
      suggestions = allSuggestions
        .filter(
          (s) =>
            (s.field.toLowerCase().startsWith(fieldPart) ||
              (s.field === 'author' && 'nick'.startsWith(fieldPart))) &&
            (valuePart === '' || s.value.toLowerCase().includes(valuePart)),
        )
        .slice(0, 20)
    } else {
      suggestions = allSuggestions
        .filter(
          (s) => s.field.toLowerCase().includes(lower) || s.value.toLowerCase().includes(lower),
        )
        .slice(0, 20)
    }

    if (suggestions.length === 0 && lower.length >= 3) {
      suggestions = [{ key: 'text-search', field: 'title', value: val }]
    }

    setFilteredSuggestions(suggestions)
    setShowDropdown(true)
  }

  const onBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false)
    }, 150)
  }

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    }
  }, [])

  const submit = (nextTmp: FindType) => {
    searchBy(nextTmp)
  }

  const onSelect = (sug: Suggestion) => {
    const nextTmp = { ...tmp }
    const field = sug.field === 'author' ? 'nick' : sug.field

    if (field === 'tags') {
      const tags = Array.isArray(nextTmp.tags) ? [...nextTmp.tags] : []
      if (!tags.includes(sug.value)) tags.push(sug.value)
      nextTmp.tags = tags
    } else if (field === 'month') {
      const idx = months.findIndex((m) => m.toLowerCase() === sug.value.toLowerCase())
      if (idx !== -1) nextTmp.month = idx + 1
    } else if (field === 'day') {
      nextTmp.day = parseInt(sug.value, 10)
    } else if (field === 'year') {
      nextTmp.year = parseInt(sug.value, 10)
    } else if (field === 'title') {
      nextTmp.text = sug.value
    } else {
      nextTmp[field as keyof FindType] = sug.value as never
    }

    setTmp(nextTmp)
    setSearchInput('')
    setFilteredSuggestions([])
    setShowDropdown(false)
    submit(nextTmp)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
      )
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : -1))
      return
    }
    if (e.key === 'Escape') {
      setShowDropdown(false)
      return
    }
    if (e.key !== 'Enter') return

    if (activeIdx >= 0 && filteredSuggestions[activeIdx]) {
      e.preventDefault()
      onSelect(filteredSuggestions[activeIdx])
      return
    }
    if (searchInput.length >= 3) {
      const nextTmp = { ...tmp, text: searchInput }
      setTmp(nextTmp)
      setSearchInput('')
      setFilteredSuggestions([])
      setShowDropdown(false)
      submit(nextTmp)
    }
  }

  const getMonthName = (monthNum: number) => months[monthNum - 1] || ''

  const removeFilter = (field: keyof FindType) => {
    const nextTmp = { ...tmp }
    delete nextTmp[field]
    setTmp(nextTmp)
    submit(nextTmp)
  }

  const removeTag = (tag: string) => {
    if (tmp.tags) {
      const nextTags = tmp.tags.filter((t) => t !== tag)
      const nextTmp = { ...tmp }
      if (nextTags.length === 0) {
        delete nextTmp.tags
      } else {
        nextTmp.tags = nextTags
      }
      setTmp(nextTmp)
      submit(nextTmp)
    }
  }

  const clearAll = () => {
    setTmp({})
    submit({})
  }

  return (
    <div className="relative flex-1 flex items-center min-w-0">
      {/* Active filter chips row + input */}
      <div className="search-container flex flex-1 items-center gap-1 min-h-[36px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus-within:border-primary focus-within:bg-white dark:focus-within:bg-gray-900 transition-all overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Active filter chips */}
        {tmp.text && (
          <span
            className="chip inline-flex items-center px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-90 transition-opacity select-none whitespace-nowrap shrink-0 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
            onClick={() => removeFilter('text')}
          >
            {tmp.text}&nbsp;✕
          </span>
        )}
        {tmp.kind && (
          <span
            className="chip inline-flex items-center px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-90 transition-opacity select-none whitespace-nowrap shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
            onClick={() => removeFilter('kind')}
          >
            {tmp.kind}&nbsp;✕
          </span>
        )}
        {tmp.tags && Array.isArray(tmp.tags) && (
          <>
            {tmp.tags.map((tag) => (
              <span
                key={tag}
                className="chip inline-flex items-center px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-90 transition-opacity select-none whitespace-nowrap shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                onClick={() => removeTag(tag)}
              >
                {tag}&nbsp;✕
              </span>
            ))}
          </>
        )}
        {tmp.year && (
          <span
            className="chip inline-flex items-center px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-90 transition-opacity select-none whitespace-nowrap shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            onClick={() => removeFilter('year')}
          >
            {tmp.year}&nbsp;✕
          </span>
        )}
        {tmp.month && (
          <span
            className="chip inline-flex items-center px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-90 transition-opacity select-none whitespace-nowrap shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            onClick={() => removeFilter('month')}
          >
            {getMonthName(tmp.month)}&nbsp;✕
          </span>
        )}
        {tmp.day && (
          <span
            className="chip inline-flex items-center px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-90 transition-opacity select-none whitespace-nowrap shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            onClick={() => removeFilter('day')}
          >
            {tmp.day}&nbsp;✕
          </span>
        )}
        {tmp.model && (
          <span
            className="chip inline-flex items-center px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-90 transition-opacity select-none whitespace-nowrap shrink-0 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
            onClick={() => removeFilter('model')}
          >
            {tmp.model}&nbsp;✕
          </span>
        )}
        {tmp.lens && (
          <span
            className="chip inline-flex items-center px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-90 transition-opacity select-none whitespace-nowrap shrink-0 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
            onClick={() => removeFilter('lens')}
          >
            {tmp.lens}&nbsp;✕
          </span>
        )}
        {tmp.nick && (
          <span
            className="chip inline-flex items-center px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-90 transition-opacity select-none whitespace-nowrap shrink-0 bg-secondary/20 text-teal-850 dark:bg-secondary/30 dark:text-secondary"
            onClick={() => removeFilter('nick')}
          >
            {tmp.nick}&nbsp;✕
          </span>
        )}

        {/* Text input */}
        <input
          type="text"
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
          value={searchInput}
          placeholder={hasActiveFilters ? '' : 'by tag: beograd year: 2022 etc…'}
          onKeyDown={handleKeyDown}
          onChange={(e) => onInput(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={onBlur}
        />

        {/* Clear all button */}
        {hasActiveFilters && (
          <button
            type="button"
            className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
            onClick={clearAll}
            title="Clear all filters"
          >
            <AppIcon name="clear_all" className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {showDropdown && filteredSuggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 z-50 max-h-60 overflow-y-auto rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl py-1">
          {filteredSuggestions.map((sug, idx) => (
            <li
              key={sug.key}
              className={`px-4 py-2 text-sm cursor-pointer select-none ${
                activeIdx === idx
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(sug)
              }}
            >
              <strong>{sug.field === 'title' ? 'title' : sug.field}:</strong> {sug.value}
            </li>
          ))}
          {searchInput.length >= 3 && filteredSuggestions.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-500">
              Press Enter to search in headlines for "{searchInput}"
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export default GlobalSearch
