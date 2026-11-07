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
    path: '/auth/set-password',
    name: 'set-password',
    component: () => import('@/pages/SetPasswordView.vue'),
    meta: { public: true, title: 'Set your password' },
  },
  {
    // Older invite emails point here; keep their token hash or tokens.
    path: '/auth/callback',
    redirect: (to) => ({ name: 'set-password', query: to.query, hash: to.hash }),
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
      {
        path: 'applications',
        name: 'applications',
        component: () => import('@/pages/ApplicationsView.vue'),
        meta: { title: 'Applications' },
      },
      {
        path: 'registrations',
        name: 'registrations',
        component: () => import('@/pages/RegistrationsView.vue'),
        meta: { title: 'Registrations' },
      },
      {
        path: 'messages',
        name: 'messages',
        component: () => import('@/pages/MessagesView.vue'),
        meta: { title: 'Messages' },
      },
      {
        path: 'testimonials',
        name: 'testimonials',
        component: () => import('@/pages/TestimonialsView.vue'),
        meta: { title: 'Testimonials' },
      },
      {
        path: 'content',
        name: 'content',
        component: () => import('@/pages/SettingsView.vue'),
        meta: { title: 'Content & links' },
      },
      {
        path: 'staff',
        name: 'staff',
        component: () => import('@/pages/StaffView.vue'),
        meta: { title: 'Staff', superAdmin: true },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/pages/ProfileView.vue'),
        meta: { title: 'Your profile' },
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
