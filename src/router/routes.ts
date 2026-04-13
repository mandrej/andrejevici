import CONFIG from '../config'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/Plain.vue'),
    meta: { title: CONFIG.title },
    children: [{ path: '', name: 'home', component: () => import('../pages/IndexPage.vue') }],
  },
  {
    path: '/list',
    component: () => import('../layouts/Default.vue'),
    meta: { title: 'Filter' },
    children: [
      {
        path: '',
        name: 'list',
        components: {
          default: () => import('../pages/ListPage.vue'),
          sidebar: () => import('../components/sidebar/ListSidebar.vue'),
          toolbar: () => import('../components/toolbar/ListToolbar.vue'),
        },
      },
    ],
  },
  {
    path: '/add',
    component: () => import('../layouts/Default.vue'),
    meta: { title: 'Add', requiresAuth: true },
    children: [
      {
        path: '',
        name: 'add',
        components: {
          default: () => import('../pages/AddPage.vue'),
          sidebar: () => import('../components/sidebar/DefaultSidebar.vue'),
          toolbar: () => import('../components/toolbar/AddToolbar.vue'),
        },
      },
    ],
  },
  {
    path: '/admin',
    component: () => import('../layouts/Default.vue'),
    meta: { title: 'Administration', requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'admin',
        components: {
          default: () => import('../pages/AdminPage.vue'),
          sidebar: () => import('../components/sidebar/DefaultSidebar.vue'),
          toolbar: () => import('../components/toolbar/AdminToolbar.vue'),
        },
      },
    ],
  },
  {
    path: '/401',
    component: () => import('../layouts/Plain.vue'),
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: '401',
        component: () => import('../pages/ErrorPage.vue'),
        props: { code: 401 },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('../layouts/Plain.vue'),
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: '404',
        component: () => import('../pages/ErrorPage.vue'),
        props: { code: 404 },
      },
    ],
  },
]

export default routes
