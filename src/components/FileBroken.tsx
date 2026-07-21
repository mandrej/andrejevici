import React from 'react'
import AppIcon from './atoms/AppIcon'

export const FileBroken: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <AppIcon name="broken_image" className="w-16 h-16 text-gray-400 dark:text-gray-500" />
    </div>
  )
}

export default FileBroken
