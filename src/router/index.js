import { nextTick } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { CONFIG } from "../helpers";
import routes from "./routes";

const router = createRouter({
  scrollBehavior: () => ({ left: 0, top: 0 }),
  routes,
  history: createWebHistory(process.env.VUE_ROUTER_BASE),
});

router.beforeEach((to, from) => {
  const auth = useAuthStore();
  const user = auth.user;
  // Unlog user after 7 days
  if (user && user.uid) {
    if (+new Date() - +new Date(user.lastLogin) > CONFIG.lifeSpan) {
      auth.signIn();
    }
  }
  if (to.meta.requiresAuth && !user.isAuthorized) {
    return { name: "401", replace: true };
  } else if (to.meta.requiresAdmin && !user.isAdmin) {
    return { name: "401", replace: true };
  }
});
router.afterEach((to, from) => {
  // Use next tick to handle router history correctly
  // see: https://github.com/vuejs/vue-router/issues/914#issuecomment-384477609
  nextTick(() => {
    document.title = to.meta.title;
  });
});

export default router;
