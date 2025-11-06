import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from 'src/stores/user'
import routes from './routes'
import type { RouteLocationNormalized } from 'vue-router'
import type { MyUserType } from 'src/helpers/models'
import CONFIG from 'app/config'

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

router.beforeEach((to: RouteLocationNormalized) => {
  const auth = useUserStore()
  const user = (auth.user as MyUserType) || null

  if (to.meta.requiresAuth && !(user && user.isAuthorized)) {
    return { name: '401', replace: true }
  } else if (to.meta.requiresAdmin && !(user && user.isAdmin)) {
    return { name: '401', replace: true }
  }
})
router.afterEach((to: RouteLocationNormalized) => {
  // Use next tick to handle router history correctly
  void nextTick(() => {
    document.title = (to.meta.title as string) || CONFIG.title
  })
})

export default router
