import CONFIG from '../config'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    /**
     * Loads the route component.
     */
    component: () => import('../layouts/Plain.vue'),
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: 'home',
        /**
         * Loads the route component.
         */
        component: () => import('../pages/IndexPage.vue'),
      },
    ],
  },
  {
    path: '/list',
    /**
     * Loads the route component.
     */
    component: () => import('../layouts/Default.vue'),
    meta: { title: 'Album' },
    children: [
      {
        path: '',
        name: 'list',
        components: {
          /**
           * Loads the default layout component.
           */
          default: () => import('../pages/ListPage.vue'),
          /**
           * Loads the sidebar component.
           */
          sidebar: () => import('../components/sidebar/Sidebar.vue'),
          /**
           * Loads the toolbar component.
           */
          toolbar: () => import('../components/toolbar/ListToolbar.vue'),
        },
      },
    ],
  },
  {
    path: '/add',
    /**
     * Loads the route component.
     */
    component: () => import('../layouts/Default.vue'),
    meta: { title: 'Add', requiresAuth: true },
    children: [
      {
        path: '',
        name: 'add',
        components: {
          /**
           * Loads the default layout component.
           */
          default: () => import('../pages/AddPage.vue'),
          /**
           * Loads the sidebar component.
           */
          sidebar: () => import('../components/sidebar/Sidebar.vue'),
          /**
           * Loads the toolbar component.
           */
          toolbar: () => import('../components/toolbar/AddToolbar.vue'),
        },
      },
    ],
  },
  {
    path: '/admin',
    /**
     * Loads the route component.
     */
    component: () => import('../layouts/Default.vue'),
    meta: { title: 'Administration', requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'admin',
        components: {
          /**
           * Loads the default layout component.
           */
          default: () => import('../pages/AdminPage.vue'),
          /**
           * Loads the sidebar component.
           */
          sidebar: () => import('../components/sidebar/Sidebar.vue'),
          /**
           * Loads the toolbar component.
           */
          toolbar: () => import('../components/toolbar/AdminToolbar.vue'),
        },
      },
    ],
  },
  {
    path: '/401',
    /**
     * Loads the route component.
     */
    component: () => import('../layouts/Plain.vue'),
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: '401',
        /**
         * Loads the route component.
         */
        component: () => import('../pages/ErrorPage.vue'),
        props: { code: 401 },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    /**
     * Loads the route component.
     */
    component: () => import('../layouts/Plain.vue'),
    meta: { title: CONFIG.title },
    children: [
      {
        path: '',
        name: '404',
        /**
         * Loads the route component.
         */
        component: () => import('../pages/ErrorPage.vue'),
        props: { code: 404 },
      },
    ],
  },
]

export default routes
