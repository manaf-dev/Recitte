import { createRouter, type RouteRecordRaw, type RouterHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { authGuard } from './guard'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginView.vue'),
    meta: { public: true, title: 'Sign in' },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/pages/AuthCallbackView.vue'),
    meta: { public: true, title: 'Signing in' },
  },
  {
    path: '/',
    component: AdminLayout,
    children: [
      {
        path: '',
        name: 'overview',
        component: () => import('@/pages/OverviewView.vue'),
        meta: { title: 'Overview' },
      },
      {
        path: 'programs',
        name: 'programs',
        component: () => import('@/pages/ProgramsView.vue'),
        meta: { title: 'Programs' },
      },
      {
        path: 'programs/new',
        name: 'program-new',
        component: () => import('@/pages/ProgramEditView.vue'),
        meta: { title: 'Add a program' },
      },
      {
        path: 'programs/:id',
        name: 'program-edit',
        component: () => import('@/pages/ProgramEditView.vue'),
        props: true,
        meta: { title: 'Edit program' },
      },
    ],
  },
  {
    // Unknown paths still pass the guard first, so a signed-out visitor keeps
    // the path they asked for; signed-in staff land on Overview.
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: { render: () => null },
    beforeEnter: () => ({ name: 'overview' }),
  },
]

export function createAdminRouter(history: RouterHistory) {
  const router = createRouter({ history, routes })
  router.beforeEach(authGuard)
  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} · Recitte Admin` : 'Recitte Admin'
  })
  return router
}
