import { boot } from "quasar/wrappers";
import { useUserStore } from "../stores/user";

export default boot(({ router, store }) => {
  router.beforeEach((to, from) => {
    const auth = useUserStore(store);
    const user = auth.user;

    if (to.meta.requiresAuth && !user.isAuthorized) {
      return { name: "401", replace: true };
    } else if (to.meta.requiresAdmin && !user.isAdmin) {
      return { name: "401", replace: true };
    }
  });
});
