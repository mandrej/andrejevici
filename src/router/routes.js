import { defineAsyncComponent } from "vue";
import { CONFIG } from "../helpers";

const Find = defineAsyncComponent(() => import("../components/Find.vue"));
const Stat = defineAsyncComponent(() => import("../components/Stat.vue"));

const routes = [
  {
    path: "/",
    component: () => import("../layouts/Plain.vue"),
    children: [
      {
        path: "",
        name: "home",
        component: () => import("../pages/Index.vue"),
        meta: { title: CONFIG.title },
      },
    ],
  },
  {
    path: "/list",
    component: () => import("../layouts/Default.vue"),
    meta: { sidebar: Find },
    children: [
      {
        path: "",
        component: () => import("../pages/List.vue"),
        name: "list",
        meta: { title: CONFIG.title },
      },
    ],
  },
  {
    path: "/add",
    component: () => import("../layouts/Default.vue"),
    meta: { sidebar: Stat },
    children: [
      {
        path: "",
        component: () => import("../pages/Add.vue"),
        name: "add",
        meta: { title: "Add", requiresAuth: true },
      },
    ],
  },
  {
    path: "/admin",
    component: () => import("../layouts/Default.vue"),
    meta: { sidebar: Stat },
    children: [
      {
        path: "",
        component: () => import("../pages/Admin.vue"),
        name: "admin",
        meta: { title: "Administration", requiresAdmin: true },
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
        component: () => import("../pages/Error.vue"),
        props: { code: 401 },
        meta: { title: "Error 401" },
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
        component: () => import("../pages/Error.vue"),
        props: { code: 404 },
        meta: { title: "Error 404" },
      },
    ],
  },
];

export default routes;
