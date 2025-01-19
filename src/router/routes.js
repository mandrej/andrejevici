import { CONFIG } from '../helpers'

const routes = [
  {
    path: '/',
    component: () => import('../layouts/Plain.vue'),
    meta: { title: CONFIG.title },
    children: [{ path: '', name: 'home', component: () => import('../pages/Index-Page.vue') }],
  },
  {
    path: '/list',
    component: () => import('../layouts/Default.vue'),
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: 'list',
        components: {
          default: () => import('../pages/Browser-Page.vue'),
          sidebar: () => import('../components/Find.vue'),
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
          default: () => import('../pages/Add-Page.vue'),
          sidebar: () => import('../components/Stat.vue'),
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
          default: () => import('../pages/Admin-Page.vue'),
          sidebar: () => import('../components/Stat.vue'),
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
        component: () => import('../pages/Error-Page.vue'),
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
        component: () => import('../pages/Error-Page.vue'),
        props: { code: 404 },
      },
    ],
  },
]

export default routes
