'use client'

import React, { useState, useEffect, useRef } from 'react'
import DefaultLayout from '@/components/layouts/DefaultLayout'
import PictureCard from '@/components/PictureCard'
import SwiperView from '@/components/dialog/SwiperView'
import ErrorBanner from '@/components/ErrorBanner'
import AppDialog from '@/components/atoms/AppDialog'
import AppButton from '@/components/atoms/AppButton'
import AppCheckbox from '@/components/atoms/AppCheckbox'
import AppIcon from '@/components/atoms/AppIcon'
import EditPhotoRecord from '@/components/dialog/EditPhotoRecord'
import EditVideoRecord from '@/components/dialog/EditVideoRecord'
import { useAppStore } from '@/stores/appStore'
import { useUserStore } from '@/stores/userStore'
import { fakeHistory, isAuthorOrAdmin, formatBytes, dummy, formatDatum } from '@/helpers'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import notify from '@/helpers/notify'
import { logAnalyticsEvent } from '@/firebase'
import type { PhotoType } from '@/helpers/models'

export default function ListPage() {
  // App Store selectors
  const objects = useAppStore((state) => state.objects)
  const busy = useAppStore((state) => state.busy)
  const error = useAppStore((state) => state.error)
  const next = useAppStore((state) => state.next)
  const find = useAppStore((state) => state.find)
  const showCarousel = useAppStore((state) => state.showCarousel)
  const setShowCarousel = useAppStore((state) => state.setShowCarousel)
  const showConfirm = useAppStore((state) => state.showConfirm)
  const setShowConfirm = useAppStore((state) => state.setShowConfirm)
  const showEdit = useAppStore((state) => state.showEdit)
  const setShowEdit = useAppStore((state) => state.setShowEdit)
  const currentEdit = useAppStore((state) => state.currentEdit)
  const setCurrentEdit = useAppStore((state) => state.setCurrentEdit)
  const selected = useAppStore((state) => state.selected)
  const setSelected = useAppStore((state) => state.setSelected)
  const fetchRecords = useAppStore((state) => state.fetchRecords)
  const fetchPhoto = useAppStore((state) => state.fetchPhoto)
  const deleteRecord = useAppStore((state) => state.deleteRecord)

  // User Store selectors
  const user = useUserStore((state) => state.user)

  // Local state
  const [index, setIndex] = useState(-1)
  const [select2delete, _setSelect2delete] = useState<PhotoType | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const skipNextFindFetchRef = useRef(false)

  // popstate handler to dismiss dialogs on back button
  useEffect(() => {
    const handlePopState = () => {
      setShowConfirm(false)
      setShowEdit(false)
      setShowCarousel(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [setShowConfirm, setShowEdit, setShowCarousel])

  // scroll listener
  useEffect(() => {
    const main = document.querySelector('main')
    const handleScroll = () => {
      if (main) {
        setShowScrollTop(main.scrollTop > 150)
      }
    }

    if (main) {
      main.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      if (main) {
        main.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  const scrollToTop = () => {
    const main = document.querySelector('main')
    if (main) {
      main.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Load implementation
  const onLoad = async (done: (stop?: boolean) => void) => {
    if (error === 'empty' || (objects.length > 0 && !next)) {
      done(true)
      return
    }
    try {
      const isInitial = objects.length === 0
      await fetchRecords(isInitial)
      // Read `next` from the store after the fetch — the closure value is stale.
      done(!useAppStore.getState().next)
    } catch (err) {
      console.error('Infinite scroll error:', err)
      done(true)
    }
  }

  const { sentinelRef, loading, reset } = useInfiniteScroll(onLoad)

  // Watch filters (find query) to reload
  useEffect(() => {
    reset()
    if (skipNextFindFetchRef.current) {
      skipNextFindFetchRef.current = false
      return
    }
    void fetchRecords(true)
  }, [find])

  // Watch URL hash on mount to find photo if passed via share link
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const filename = hash.substring(2) // removes "#/"
      setTimeout(() => {
        void findPhotoAndShow(filename)
      }, 1000)
    }
  }, [])

  const findPhotoAndShow = async (c: string) => {
    let rec: PhotoType | null | undefined = objects.find((x) => x.filename === c)
    if (!rec) {
      rec = await fetchPhoto(c)
    }

    if (rec && rec.year && rec.month) {
      skipNextFindFetchRef.current = true
      useAppStore.setState({ find: { year: rec.year, month: rec.month } })
      await fetchRecords(true)
    }

    const idx = useAppStore.getState().objects.findIndex((x) => x.filename === c)
    if (idx !== -1) {
      window.history.replaceState(history.state, '', window.location.pathname)
      setIndex(idx)
      setShowCarousel(true)
    } else {
      notify({ type: 'warning', message: 'Photo not found' })
    }
  }

  const confirmOk = (rec: PhotoType) => {
    setShowConfirm(false)
    deleteRecord(rec)
    if (useAppStore.getState().objects.length === 0 && showCarousel) {
      setShowCarousel(false)
      useAppStore.setState({ error: 'empty' })
    }
  }

  const editRecord = (rec: PhotoType) => {
    setCurrentEdit(rec)
    fakeHistory()
    setShowEdit(true)
  }

  const editOk = (filename: string) => {
    const el = document.getElementById(filename)
    if (!el) return
    el.classList.add('bounce')
    setTimeout(() => el.classList.remove('bounce'), 2000)
  }

  const carouselShow = (c: string) => {
    const idx = objects.findIndex((x) => x.filename === c)
    if (idx !== -1) {
      fakeHistory()
      setIndex(idx)
      setShowCarousel(true)

      const obj = objects[idx]
      logAnalyticsEvent('detailed_view', {
        when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
        who: user?.email ? dummy(user.email) : 'anonymous',
        filename: obj.filename,
        headline: obj.headline || '',
        kind: obj.kind,
      })
    } else {
      notify({ type: 'warning', message: 'Photo not found' })
    }
  }

  const carouselCancel = (hash: string | null) => {
    setShowCarousel(false)
    setIndex(-1)
    if (hash) {
      const el = document.getElementById(hash.replace('#', ''))
      if (el) {
        const main = document.querySelector('main')
        if (main) {
          main.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
        } else {
          window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
        }
      }
    }
  }

  const handleCheckboxChange = (checked: boolean, item: PhotoType) => {
    if (checked) {
      setSelected([...selected, item])
    } else {
      setSelected(selected.filter((x) => x.filename !== item.filename))
    }
  }

  return (
    <DefaultLayout>
      {showEdit &&
        currentEdit &&
        (currentEdit.kind === 'video' ? (
          <EditVideoRecord rec={currentEdit} onEditOk={editOk} />
        ) : (
          <EditPhotoRecord rec={currentEdit} onEditOk={editOk} />
        ))}

      {/* Confirm Delete Dialog */}
      <AppDialog modelValue={showConfirm} maxWidth="max-w-sm" onChange={setShowConfirm}>
        <div className="p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
            Confirm Delete
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Would you like to delete {formatBytes(select2delete?.size || 0)} photo named '
            {select2delete?.headline}'?
          </p>
          <div className="flex justify-between gap-3">
            <AppButton
              color="primary"
              label="OK"
              onClick={() => confirmOk(select2delete as PhotoType)}
            />
            <AppButton flat label="Close" onClick={() => setShowConfirm(false)} />
          </div>
        </div>
      </AppDialog>

      {/* Error Banners */}
      <ErrorBanner
        inquiry={!busy && error === 'empty'}
        title="No data found"
        detail="for current filter / search"
      />

      <ErrorBanner
        inquiry={!busy && error !== '' && error !== 'empty'}
        title="Something went wrong ..."
        detail={error}
      />

      {showCarousel && index !== -1 && (
        <SwiperView index={index} onCarouselCancel={carouselCancel} />
      )}

      <div className="p-4 pb-16">
        {/* Photo grid */}
        <div className="flex flex-wrap gap-4">
          {objects.map((item) => (
            <div
              key={item.filename}
              className="shrink-0"
              style={{ minWidth: '250px', maxWidth: '400px', flex: 1 }}
            >
              <PictureCard
                rec={item}
                onCarouselShow={carouselShow}
                action={
                  isAuthorOrAdmin(user, item) && (
                    <div className="absolute top-3 right-2 flex flex-col items-center gap-1">
                      {/* Batch select checkbox */}
                      {(user?.isAdmin || user?.email === item.email) && (
                        <AppCheckbox
                          modelValue={selected.some((x) => x.filename === item.filename)}
                          onChange={(checked) => handleCheckboxChange(!!checked, item)}
                          className="text-white drop-shadow-md hover:scale-110 transition-transform p-1"
                        />
                      )}
                      <button
                        className="text-white drop-shadow-md hover:scale-110 transition-transform p-1"
                        onClick={() => editRecord(item)}
                      >
                        <AppIcon name="edit" className="w-6 h-6 leading-none" />
                      </button>
                    </div>
                  )
                }
              />
            </div>
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {/* Loading spinner */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* End of list */}
        {!next && objects.length > 0 && (
          <div className="text-center py-10">
            <span className="text-xs uppercase tracking-widest text-gray-400">
              End of list ({objects.length} records)
            </span>
          </div>
        )}
      </div>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          className="fixed bottom-5 right-5 z-50 p-3 rounded-full bg-warning text-black shadow-lg hover:scale-110 active:scale-95 transition-all"
          onClick={scrollToTop}
        >
          <AppIcon name="arrow_upward" className="w-6 h-6" />
        </button>
      )}
    </DefaultLayout>
  )
}
