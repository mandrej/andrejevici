<template>
  <!-- PhotoSwipe appends its own DOM elements to the body, so we don't need to render anything here. -->
  <div style="display: none"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { U } from 'src/helpers'
import CONFIG from 'app/config'
import { useQuasar, copyToClipboard } from 'quasar'
import notify from 'src/helpers/notify'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import type { PhotoType } from 'src/helpers/models'

const props = defineProps<{
  index: number
}>()
const emit = defineEmits(['carousel-cancel'])

const $q = useQuasar()
const app = useAppStore()
const { objects, showCarousel } = storeToRefs(app)

let lightbox: PhotoSwipeLightbox | null = null

const getCaption = (rec: PhotoType, showExtra: boolean): string => {
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

const onShare = async () => {
  if (!lightbox || !lightbox.pswp) return
  const currSlide = lightbox.pswp.currSlide
  if (currSlide && currSlide.data.obj) {
    const obj = currSlide.data.obj as PhotoType
    const hash = U + obj.filename
    const url = window.location.origin + window.location.pathname + (hash ? '#' + hash : '')

    try {
      await copyToClipboard(url)
      notify({ message: 'URL copied to clipboard', icon: 'check' })
    } catch (e) {
      console.error('Share error:', e)
      notify({ type: 'warning', message: 'Unable to copy URL to clipboard' })
    }
  }
}

const initLightbox = () => {
  const dataSource = objects.value.map((obj) => {
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
    bgOpacity: 0.9,
    counter: false,
    zoom: false,
    // Dynamic import for the core module
    pswpModule: () => import('photoswipe'),
  })

  // Register custom UI elements
  lightbox.on('uiRegister', () => {
    const pswp = lightbox?.pswp
    if (!pswp) return

    // Caption
    pswp.ui?.registerElement({
      name: 'custom-caption',
      order: 9,
      isButton: false,
      appendTo: 'root',
      html: '',
      onInit: (el) => {
        pswp.on('change', () => {
          const currSlide = pswp.currSlide
          if (currSlide && currSlide.data.obj) {
            const obj = currSlide.data.obj as PhotoType
            el.innerHTML = `<div class="text-white text-center q-pa-sm ellipsis" style="background: rgba(0,0,0,0.5); width: 100%; position: absolute; top: 0; left: 0; z-index: 2000;">${getCaption(obj, $q.screen.gt.sm)}</div>`
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
      html: '<i class="q-icon material-icons" style="font-size: 24px; color: white;">share</i>',
      onClick: () => {
        onShare()
      },
      appendTo: 'root',
      onInit: (el) => {
        el.classList.add('pswp__custom-bottom-btn')
        el.style.right = '70px'
        el.style.background = 'none'
        el.style.padding = '10px'
        el.style.position = 'absolute'
        el.style.bottom = '20px'
        el.style.zIndex = '2000'
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
      html: '<i class="q-icon material-icons" style="font-size: 24px; color: white;">fullscreen</i>',
      onClick: () => {
        $q.fullscreen.toggle()
      },
      appendTo: 'root',
      onInit: (el) => {
        el.classList.add('pswp__custom-bottom-btn')
        el.style.right = '20px'
        el.style.background = 'none'
        el.style.padding = '10px'
        el.style.position = 'absolute'
        el.style.bottom = '20px'
        el.style.zIndex = '2000'
      },
    })
  })

  // Handle Close
  lightbox.on('close', () => {
    const curr = lightbox?.pswp?.currSlide?.data.obj as PhotoType | undefined
    const hash = curr ? U + curr.filename : null
    // We need to defer this slightly or ensure it doesn't conflict with unmount
    emit('carousel-cancel', hash)
    showCarousel.value = false
  })

  // Handle images with unknown dimensions
  lightbox.on('contentLoad', (e) => {
    const { content } = e
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

  // Custom Error Handling
  lightbox.on('contentLoadImage', (e) => {
    const { content } = e
    const img = content.element as HTMLImageElement
    if (img) {
      img.onerror = () => {
        img.src = CONFIG.fileBroken
        e.preventDefault()
      }
    }
  })

  lightbox.init()
  lightbox.loadAndOpen(props.index)
}

onMounted(() => {
  document.body.classList.add('swiper-view-active')
  initLightbox()
})

onUnmounted(() => {
  document.body.classList.remove('swiper-view-active')
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
}
</style>
