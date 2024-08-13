import { CONFIG } from "../helpers";

const routes = [
  {
    path: "/",
    component: () => import("../layouts/Plain.vue"),
    children: [
      {
        path: "",
        name: "home",
        component: () => import("../pages/Index-Page.vue"),
        meta: { title: CONFIG.title },
      },
    ],
  },
  {
    path: "/list",
    component: () => import("../layouts/Default.vue"),
    children: [
      {
        path: "",
        name: "list",
        meta: { title: CONFIG.title },
        components: {
          default: () => import("../pages/Browser-Page.vue"),
          sidebar: () => import("../components/Find.vue"),
        },
      },
    ],
  },
  {
    path: "/add",
    component: () => import("../layouts/Default.vue"),
    children: [
      {
        path: "",
        name: "add",
        meta: { title: "Add", requiresAuth: true },
        components: {
          default: () => import("../pages/Add-Page.vue"),
          sidebar: () => import("../components/Stat.vue"),
        },
      },
    ],
  },
  {
    path: "/admin",
    component: () => import("../layouts/Default.vue"),
    children: [
      {
        path: "",
        name: "admin",
        meta: { title: "Administration", requiresAdmin: true },
        components: {
          default: () => import("../pages/Admin-Page.vue"),
          sidebar: () => import("../components/Stat.vue"),
        },
      },
    ],
  },
  {
    path: "/401",
    component: () => import("../layouts/Plain.vue"),
    children: [
      {
        path: "",
        name: "401",
        meta: { title: CONFIG.title },
        component: () => import("../pages/Error-Page.vue"),
        props: { code: 401 },
      },
    ],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:pathMatch(.*)*",
    component: () => import("../layouts/Plain.vue"),
    children: [
      {
        path: "",
        name: "404",
        meta: { title: CONFIG.title },
        component: () => import("../pages/Error-Page.vue"),
        props: { code: 404 },
      },
    ],
  },
];

export default routes;
