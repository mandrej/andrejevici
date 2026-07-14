<template>
  <!-- PhotoSwipe appends its own DOM elements to the body, so we don't need to render anything here. -->
  <div style="display: none"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../../stores/app'
import { useUserStore } from '../../stores/user'
import { U, dummy, formatDatum, getYouTubeId } from '../../helpers'
import notify from '../../helpers/notify'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import type { PhotoType } from '../../helpers/models'

const props = defineProps<{
  index: number
}>()
const emit = defineEmits(['carouselCancel'])

const app = useAppStore()
const auth = useUserStore()
const { objects, showCarousel } = storeToRefs(app)

let lightbox: PhotoSwipeLightbox | null = null

window.onpopstate = function () {
  emit('carouselCancel', null)
}

/**
 * Builds the HTML caption string shown below each slide.
 *
 * @param rec - The photo record for the current slide.
 * @param showExtra - When `true`, appends camera model and lens information.
 * @returns An HTML string with headline and shooting data.
 */
const getCaption = (rec: PhotoType, showExtra: boolean): string => {
  if (rec.kind === 'video') return rec.headline || ''

  let tmp = ''
  const { headline, aperture, shutter, iso, model, lens } = rec
  tmp += (headline || '') + '<br/>'
  tmp += aperture ? ' f' + aperture : ''
  tmp += shutter ? ' ' + shutter + 's' : ''
  tmp += iso ? ' ' + iso + ' ASA' : ''
  if (showExtra) {
    tmp += model ? ' ' + model : ''
    tmp += lens ? ' ' + lens : ''
  }
  return tmp
}

/**
 * Copies the URL of the currently displayed photo (with a filename hash anchor)
 * to the clipboard and shows a confirmation notification.
 */
const onShare = async () => {
  if (!lightbox || !lightbox.pswp) return
  const currSlide = lightbox.pswp.currSlide
  if (currSlide && currSlide.data.obj) {
    const obj = currSlide.data.obj as PhotoType
    const hash = U + obj.filename
    const url = window.location.origin + window.location.pathname + (hash ? '#' + hash : '')

    try {
      await navigator.clipboard.writeText(url)
      notify({ type: 'positive', message: 'URL copied to clipboard', icon: 'sym_r_check' })
      gtag('event', 'share', {
        when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
        who: auth.user?.email ? dummy(auth.user?.email) : 'anonymous',
        filename: obj.filename,
        headline: obj.headline || '',
        kind: obj.kind || 'photo',
      })
    } catch (e) {
      console.error('Share error:', e)
      notify({ type: 'warning', message: 'Unable to copy URL to clipboard' })
    }
  }
}

/**
 * Sends a `pauseVideo` postMessage command to all embedded YouTube iframes
 * currently rendered inside the PhotoSwipe overlay.
 */
const pauseAllVideos = () => {
  const iframes = document.querySelectorAll<HTMLIFrameElement>('.pswp .video-wrapper iframe')
  iframes.forEach((iframe) => {
    iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*')
  })
}

/**
 * Creates and initialises a PhotoSwipe lightbox from the current `objects`
 * list. Registers custom UI elements (caption bar, share button, fullscreen
 * button), wires up slide-change, close, and contentLoad event handlers, and
 * opens the lightbox at `props.index`.
 */
const initLightbox = () => {
  const dataSource = objects.value.map((obj) => {
    if (obj.kind === 'video') {
      const id = getYouTubeId(obj.url)
      return {
        html: `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${id}?autoplay=0&rel=0&iv_load_policy=3&controls=0&playlist=${id}&loop=1&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`,
        obj: obj,
      }
    }
    // PhotoSwipe v5 requires width/height.
    // We try to use obj.dim if available, otherwise default to 0 and update on load.
    // Assuming obj.dim is [width, height]
    const w = obj.dim ? obj.dim[0] : 0
    const h = obj.dim ? obj.dim[1] : 0
    return {
      src: obj.url,
      width: w,
      height: h,
      alt: obj.headline || '',
      obj: obj, // Pass the whole object for custom UI access
    }
  })

  lightbox = new PhotoSwipeLightbox({
    dataSource,
    index: props.index,
    closeOnVerticalDrag: false,
    wheelToZoom: false,
    bgOpacity: 1,
    // counter: false,
    zoom: false,
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 1,
    // maxZoomLevel: 1,
    // Dynamic import for the core module
    /**
     * Loads the PhotoSwipe module.
     */
    pswpModule: () => import('photoswipe'),
  })

  // Register custom UI elements
  lightbox.on('uiRegister', () => {
    const pswp = lightbox?.pswp
    if (!pswp) return

    const appendToBottomBar = (el: HTMLElement) => {
      let bar = pswp.element?.querySelector('.my-bottom-bar') as HTMLElement | null
      if (!bar && pswp.element) {
        bar = document.createElement('div')
        bar.className = 'my-bottom-bar'
        bar.style.cssText =
          'position: absolute; bottom: 20px; left: 0; width: 100%; display: flex; justify-content: center; gap: 15px; z-index: 2000; pointer-events: none;'
        pswp.element.appendChild(bar)
      }
      if (bar) {
        setTimeout(() => {
          el.style.position = 'static'
          el.style.pointerEvents = 'auto'
          bar.appendChild(el)
        }, 0)
      }
    }

    // Caption
    pswp.ui?.registerElement({
      name: 'custom-caption',
      order: 9,
      isButton: false,
      appendTo: 'root',
      html: '',
      /**
       * Handles on init.
       *
       * @param el - The el value.
       */
      onInit: (el) => {
        pswp.on('change', () => {
          const currSlide = pswp.currSlide
          if (currSlide && currSlide.data.obj) {
            const obj = currSlide.data.obj as PhotoType
            el.innerHTML = `<div class="text-white text-center" style="padding: 8px; background: rgba(0,0,0,0.5); width: 100%; position: absolute; top: 0; left: 0; z-index: 2000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${getCaption(obj, window.innerWidth > 600)}</div>`
            gtag('event', 'detailed_view', {
              when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
              who: auth.user?.email ? dummy(auth.user?.email) : 'anonymous',
              filename: obj.filename,
              headline: obj.headline || '',
              kind: obj.kind,
            })
          }
        })
      },
    })

    // Close Button (replacing default or adding extra? Default close button exists top-right)
    // The original had a close button in the top bar. PhotoSwipe has one by default.
    // We will rely on PhotoSwipe's default close button, unless requested otherwise.
    // But we need the other buttons.

    // Share Button
    pswp.ui?.registerElement({
      name: 'share-btn',
      order: 6,
      isButton: true,
      tagName: 'button',
      html: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;user-select:none"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z" /></svg>',
      /**
       * Handles on click.
       */
      onClick: () => {
        onShare()
      },
      appendTo: 'root',
      onInit: (el) => {
        el.classList.add('pswp__custom-bottom-btn')
        appendToBottomBar(el)
      },
    })

    // Fullscreen generic toggle is handled by browser usually, but PhotoSwipe handles fullscreen API?
    // Original had q-btn calling $q.fullscreen.toggle().
    // We can add a button for that.
    pswp.ui?.registerElement({
      name: 'fs-btn',
      order: 5,
      isButton: true,
      tagName: 'button',
      html: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;user-select:none"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>',
      /**
       * Handles on click.
       */
      onClick: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          document.documentElement.requestFullscreen()
        }
      },
      appendTo: 'root',
      onInit: (el) => {
        el.classList.add('pswp__custom-bottom-btn')
        appendToBottomBar(el)
      },
    })

    // Download Button
    pswp.ui?.registerElement({
      name: 'download-btn',
      order: 4,
      isButton: true,
      tagName: 'button',
      html: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:24px;height:24px;user-select:none"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>',
      onClick: () => {
        const curr = pswp.currSlide?.data.obj as PhotoType | undefined
        if (curr) {
          // Track event
          gtag('event', 'image_download', {
            when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
            who: auth.user?.email ? dummy(auth.user?.email) : 'anonymous',
            filename: curr?.filename,
            headline: curr?.headline,
          })
          // Trigger download
          const download = async () => {
            try {
              const response = await fetch(curr.url)
              const blob = await response.blob()
              const blobUrl = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = blobUrl
              a.download = curr.filename
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(blobUrl)
            } catch (e) {
              console.error('Download failed, falling back to direct link:', e)
              const a = document.createElement('a')
              a.href = curr.url
              a.target = '_blank'
              a.download = curr.filename
              a.click()
            }
          }
          void download()
        }
      },
      appendTo: 'root',
      onInit: (el) => {
        el.classList.add('pswp__custom-bottom-btn')
        appendToBottomBar(el)

        const updateVisibility = () => {
          const currSlide = pswp.currSlide
          const obj = (currSlide?.data.obj as PhotoType | undefined) || objects.value[props.index]
          if (obj) {
            el.classList.toggle('hidden', obj.kind === 'video')
          }
        }

        // Initialize visibility
        updateVisibility()

        // Update visibility on slide change
        pswp.on('change', updateVisibility)
      },
    })
  })

  // Pause videos when swiping away
  lightbox.on('contentDeactivate', () => {
    pauseAllVideos()
  })

  // Handle Close
  lightbox.on('close', () => {
    pauseAllVideos()
    const curr = lightbox?.pswp?.currSlide?.data.obj as PhotoType | undefined
    const hash = curr ? U + curr.filename : null
    // We need to defer this slightly or ensure it doesn't conflict with unmount
    emit('carouselCancel', hash)
    showCarousel.value = false
  })

  // Handle images with unknown dimensions
  lightbox.on('contentLoad', (e) => {
    const { content } = e
    if (content.data.html) return // Skip videos

    const width = content.data.width
    const height = content.data.height

    if ((!width || !height) && content.data.src) {
      // if we don't have dimensions, load the image to find them
      const img = new Image()
      img.onload = () => {
        content.data.width = img.width
        content.data.height = img.height
        // We need to update the slide if it is currently active or invalidating it
        // PhotoSwipe doesn't have a direct 'update' on content easily without reloading
        // But setting data properties works for next accesses.
        // To force update:
        if (lightbox?.pswp) {
          lightbox.pswp.refreshSlideContent(content.index)
        }
      }
      img.src = content.data.src
    }
  })

  lightbox.init()
  lightbox.loadAndOpen(props.index)
}

const preventDefault = (e: Event) => {
  e.preventDefault()
}

onMounted(() => {
  document.body.classList.add('swiper-view-active')
  window.addEventListener('contextmenu', preventDefault)
  initLightbox()
})

onUnmounted(() => {
  document.body.classList.remove('swiper-view-active')
  window.removeEventListener('contextmenu', preventDefault)
  if (lightbox) {
    lightbox.destroy()
    lightbox = null
  }
})
</script>

<style>
/* Ensure custom buttons are positioned nicely if needed,
   though PhotoSwipe puts them in the bar by default with order. */
.pswp__button--share-btn,
.pswp__button--fs-btn,
.pswp__custom-bottom-btn {
  background: none !important;
  width: 44px;
  height: 44px;
  display: flex !important;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: pointer;
  border: none;
  padding: 0;
}

/* Make custom bottom bar SVGs white */
.pswp__custom-bottom-btn svg {
  color: white;
  stroke: white;
}

/* Override built-in close button with Heroicons XMarkIcon (white) */
.pswp__button--close {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M6 18 18 6M6 6l12 12'/%3E%3C/svg%3E") !important;
  background-size: 24px 24px !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
}
.pswp__button--close svg {
  display: none;
}

/* Override built-in prev arrow with Heroicons ChevronLeftIcon (white) */
.pswp__button--arrow--prev {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M15.75 19.5 8.25 12l7.5-7.5'/%3E%3C/svg%3E") !important;
  background-size: 32px 32px !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
}
.pswp__button--arrow--prev svg,
.pswp__button--arrow--prev::before {
  display: none !important;
}

/* Override built-in next arrow with Heroicons ChevronRightIcon (white) */
.pswp__button--arrow--next {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m8.25 4.5 7.5 7.5-7.5 7.5'/%3E%3C/svg%3E") !important;
  background-size: 32px 32px !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
}
.pswp__button--arrow--next svg,
.pswp__button--arrow--next::before {
  display: none !important;
}

/* Zoom button hidden (zoom disabled) */
.pswp__button--zoom {
  display: none !important;
}

.pswp {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.pswp::-webkit-scrollbar {
  display: none;
}

.video-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video-wrapper iframe {
  width: 100%;
  height: 100%;
}

.swiper-view-active img {
  -webkit-touch-callout: none !important;
  user-select: none !important;
}

.pswp__custom-bottom-btn.hidden {
  display: none !important;
}
</style>
