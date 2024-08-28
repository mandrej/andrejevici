import { CONFIG } from "../helpers";

const routes = [
  {
    path: "/",
    component: () => import("../layouts/Plain.vue"),
    children: [
      {
        path: "",
        name: "home",
        meta: { title: CONFIG.title },
        component: () => import("../pages/Index-Page.vue"),
      },
      {
        path: "401",
        name: "401",
        meta: { title: CONFIG.title },
        component: () => import("../pages/Error-Page.vue"),
        props: { code: 401 },
      },
      {
        path: ":pathMatch(.*)*",
        name: "404",
        meta: { title: CONFIG.title },
        component: () => import("../pages/Error-Page.vue"),
        props: { code: 404 },
      },
    ],
  },
  {
    path: "/",
    component: () => import("../layouts/Default.vue"),
    children: [
      {
        path: "list",
        name: "list",
        meta: { title: CONFIG.title },
        components: {
          default: () => import("../pages/Browser-Page.vue"),
          sidebar: () => import("../components/Find.vue"),
        },
      },
      {
        path: "add",
        name: "add",
        meta: { title: "Add", requiresAuth: true },
        components: {
          default: () => import("../pages/Add-Page.vue"),
          sidebar: () => import("../components/Stat.vue"),
        },
      },
      {
        path: "admin",
        name: "admin",
        meta: { title: "Administration", requiresAdmin: true },
        components: {
          default: () => import("../pages/Admin-Page.vue"),
          sidebar: () => import("../components/Stat.vue"),
        },
      },
    ],
  },
];

export default routes;
