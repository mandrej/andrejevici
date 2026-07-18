import React, { useMemo } from 'react'
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react'

interface TabOption {
  name: string
  label?: string
  icon?: string
}

interface AppTabsProps {
  modelValue: string
  tabs: TabOption[]
  vertical?: boolean
  onChange?: (val: string) => void
  children?: (helpers: {
    TabList: typeof TabList
    Tab: typeof Tab
    TabPanels: typeof TabPanels
    TabPanel: typeof TabPanel
  }) => React.ReactNode
}

export const AppTabs: React.FC<AppTabsProps> = ({
  modelValue,
  tabs,
  vertical = false,
  onChange,
  children,
}) => {
  const selectedIndex = useMemo(() => {
    return tabs.findIndex((t) => t.name === modelValue)
  }, [tabs, modelValue])

  const onTabChange = (index: number) => {
    if (onChange && tabs[index]) {
      onChange(tabs[index].name)
    }
  }

  return (
    <TabGroup selectedIndex={selectedIndex >= 0 ? selectedIndex : 0} onChange={onTabChange} vertical={vertical}>
      {children && children({ TabList, Tab, TabPanels, TabPanel })}
    </TabGroup>
  )
}

export default AppTabs
