import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import { authReady } from '../stores/user'
import routes from './routes'
import type { RouteLocationNormalized } from 'vue-router'
import type { MyUserType } from '../helpers/models'
import CONFIG from '../config'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */
const router = createRouter({
  scrollBehavior: () => ({ left: 0, top: 0 }),
  routes,
  history: createWebHistory(process.env.VUE_ROUTER_BASE),
})

/**
 * Global navigation guard that awaits Firebase auth initialisation before
 * evaluating route access requirements. Redirects to the 401 error page when:
 * - The route has `requiresAuth` and the user is not authorised (or lacks a nick).
 * - The route has `requiresAdmin` and the user is not an admin.
 */
router.beforeEach(async (to: RouteLocationNormalized) => {
  await authReady

  const auth = useUserStore()
  const user = (auth.user as MyUserType) || null

  if (to.meta.requiresAuth && !(user && user.isAuthorized && user.nick)) {
    return { name: '401', replace: true }
  } else if (to.meta.requiresAdmin && !(user && user.isAdmin)) {
    return { name: '401', replace: true }
  }
})
/**
 * Updates the browser tab title to the matched route's `meta.title` after
 * each navigation, with `CONFIG.title` as the fallback.
 */
router.afterEach((to: RouteLocationNormalized) => {
  // Use next tick to handle router history correctly
  void nextTick(() => {
    document.title = (to.meta.title as string) || CONFIG.title
  })
})

export default router
