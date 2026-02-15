<template>
  <!-- PhotoSwipe appends its own DOM elements to the body, so we don't need to render anything here. -->
  <div style="display: none"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useUserStore } from 'src/stores/user'
import { U, isAuthorOrAdmin } from 'src/helpers'
import CONFIG from 'app/config'
import { useQuasar, copyToClipboard } from 'quasar'
import notify from 'src/helpers/notify'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'
import type { PhotoType } from 'src/helpers/models'

const props = defineProps<{
  index: number
}>()
const emit = defineEmits(['confirm-delete', 'edit-record', 'carousel-cancel'])

const $q = useQuasar()
const app = useAppStore()
const auth = useUserStore()
const { objects, showCarousel } = storeToRefs(app)
const { user } = storeToRefs(auth)

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

const onShare = () => {
  if (!lightbox || !lightbox.pswp) return
  const currSlide = lightbox.pswp.currSlide
  if (currSlide && currSlide.data.obj) {
    const obj = currSlide.data.obj as PhotoType
    const hash = U + obj.filename
    const url = window.location.origin + window.location.pathname + (hash ? '#' + hash : '')

    copyToClipboard(url)
      .then(() => {
        notify({ message: 'URL copied to clipboard' })
      })
      .catch(() => {
        notify({ type: 'warning', message: 'Unable to copy URL to clipboard' })
      })
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
    wheelToZoom: true,
    bgOpacity: 0.9,
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

    // Edit Button
    pswp.ui?.registerElement({
      name: 'edit-btn',
      order: 8,
      isButton: true,
      tagName: 'button',
      html: '<i class="q-icon material-icons" style="font-size: 24px; color: white;">edit</i>',
      onClick: () => {
        const obj = pswp.currSlide?.data.obj as PhotoType
        if (obj) emit('edit-record', obj)
      },
      onInit: (el) => {
        // Style the button
        el.style.background = 'none'
        el.style.padding = '10px'

        const checkVisibility = () => {
          const obj = pswp.currSlide?.data.obj as PhotoType
          if (obj && isAuthorOrAdmin(user.value, obj)) {
            el.style.display = 'block'
          } else {
            el.style.display = 'none'
          }
        }
        pswp.on('change', checkVisibility)
        checkVisibility() // initial check
      },
    })

    // Delete Button
    pswp.ui?.registerElement({
      name: 'delete-btn',
      order: 7,
      isButton: true,
      tagName: 'button',
      html: '<i class="q-icon material-icons" style="font-size: 24px; color: white;">delete</i>',
      onClick: () => {
        const obj = pswp.currSlide?.data.obj as PhotoType
        if (obj) emit('confirm-delete', obj)
      },
      onInit: (el) => {
        el.style.background = 'none'
        el.style.padding = '10px'

        const checkVisibility = () => {
          const obj = pswp.currSlide?.data.obj as PhotoType
          if (obj && isAuthorOrAdmin(user.value, obj)) {
            el.style.display = 'block'
          } else {
            el.style.display = 'none'
          }
        }
        pswp.on('change', checkVisibility)
        checkVisibility()
      },
    })

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
      onInit: (el) => {
        el.style.background = 'none'
        el.style.padding = '10px'
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
      onInit: (el) => {
        el.style.background = 'none'
        el.style.padding = '10px'
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
.pswp__button--edit-btn,
.pswp__button--delete-btn,
.pswp__button--share-btn,
.pswp__button--fs-btn {
  background: none !important;
}
</style>
