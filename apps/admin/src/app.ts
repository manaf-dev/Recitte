import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'
import App from './App.vue'
import { createAdminRouter } from './router'

export function mountApp(selector: string) {
  const router = createAdminRouter(createWebHistory(import.meta.env.BASE_URL))
  createApp(App).use(router).mount(selector)
}
