import { useState, useEffect } from 'react'

let breakpointXs = 600
let breakpointSm = 768
let breakpointMd = 1024
let initialized = false

// Must match the server snapshot. During hydration `window` already exists, so reading
// `window.innerWidth` in the state initializer would render different markup than the HTML the
// server sent (React then refuses to patch it up). The real width is applied right after mount.
const SERVER_WIDTH = 1024

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
  const [width, setWidth] = useState(SERVER_WIDTH)

  useEffect(() => {
    initBreakpoints()
    setWidth(window.innerWidth)

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
