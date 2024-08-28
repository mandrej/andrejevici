import { route } from "quasar/wrappers";
import { nextTick } from "vue";
import { useUserStore } from "../stores/user";
import { createRouter, createWebHistory } from "vue-router";
import routes from "./routes";

export default route(({ store }) => {
  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createWebHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach((to, from) => {
    const auth = store.state.value.auth; // useUserStore(store);
    const user = auth.user;

    if (to.meta.requiresAuth && !(user && user.isAuthorized)) {
      return { name: "401", replace: true };
    } else if (to.meta.requiresAdmin && !(user && user.isAdmin)) {
      return { name: "401", replace: true };
    }
  });

  Router.afterEach((to, from) => {
    // Use next tick to handle router history correctly
    // see: https://github.com/vuejs/vue-router/issues/914#issuecomment-384477609

    nextTick(() => {
      document.title = to.meta.title;
    });
  });

  return Router;
});
