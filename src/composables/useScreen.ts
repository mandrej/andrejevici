import { useState, useEffect } from 'react'

let breakpointXs = 600
let breakpointSm = 768
let breakpointMd = 1024
let initialized = false

function initBreakpoints() {
  if (initialized || typeof window === 'undefined') return
  const style = window.getComputedStyle(document.documentElement)

  const xsVal = parseInt(style.getPropertyValue('--breakpoint-xs'), 10)
  const smVal = parseInt(style.getPropertyValue('--breakpoint-sm'), 10)
  const mdVal = parseInt(style.getPropertyValue('--breakpoint-md'), 10)

  if (!isNaN(xsVal)) breakpointXs = xsVal
  if (!isNaN(smVal)) breakpointSm = smVal
  if (!isNaN(mdVal)) breakpointMd = mdVal

  initialized = true
}

export function useScreen() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  )

  useEffect(() => {
    initBreakpoints()
    
    const onResize = () => {
      setWidth(window.innerWidth)
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return {
    gtXs: width > breakpointXs,
    gtSm: width > breakpointSm,
    gtMd: width > breakpointMd,
    ltSm: width <= breakpointXs,
    xs: width <= breakpointXs,
  }
}
