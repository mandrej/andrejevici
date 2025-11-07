import { CONFIG } from 'src/helpers'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/layouts/Plain.vue'),
    meta: { title: CONFIG.title },
    children: [{ path: '', name: 'home', component: () => import('src/pages/Index-Page.vue') }],
  },
  {
    path: '/list',
    component: () => import('src/layouts/Default.vue'),
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: 'list',
        components: {
          default: () => import('src/pages/List-Page.vue'),
          sidebar: () => import('src/components/sidebar/List-Sidebar.vue'),
          toolbar: () => import('src/components//toolbar/List-Toolbar.vue'),
        },
      },
    ],
  },
  {
    path: '/add',
    component: () => import('src/layouts/Default.vue'),
    meta: { title: 'Add', requiresAuth: true },
    children: [
      {
        path: '',
        name: 'add',
        components: {
          default: () => import('src/pages/Add-Page.vue'),
          sidebar: () => import('src/components/sidebar/Default-Sidebar.vue'),
          toolbar: () => import('src/components/toolbar/Add-Toolbar.vue'),
        },
      },
    ],
  },
  {
    path: '/admin',
    component: () => import('src/layouts/Default.vue'),
    meta: { title: 'Administration', requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'admin',
        components: {
          default: () => import('src/pages/Admin-Page.vue'),
          sidebar: () => import('src/components/sidebar/Default-Sidebar.vue'),
          toolbar: () => import('src/components/toolbar/Admin-Toolbar.vue'),
        },
      },
    ],
  },
  {
    path: '/401',
    component: () => import('src/layouts/Plain.vue'),
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: '401',
        component: () => import('src/pages/Error-Page.vue'),
        props: { code: 401 },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('src/layouts/Plain.vue'),
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: '404',
        component: () => import('src/pages/Error-Page.vue'),
        props: { code: 404 },
      },
    ],
  },
]

export default routes
