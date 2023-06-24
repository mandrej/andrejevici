const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [{ path: "", component: () => import("pages/IndexPage.vue") }],
  },
  {
    path: "/add",
    component: () => import("layouts/MainLayout.vue"),
    // meta: {
    //   requiresAuth: true,
    // },
    children: [{ path: "", component: () => import("pages/UploadPage.vue") }],
  },
  {
    path: "/signin",
    component: () => import("layouts/MainLayout.vue"),
    children: [{ path: "", component: () => import("pages/SignInPage.vue") }],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
