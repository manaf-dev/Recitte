import './styles.css'
import { readEnv } from './lib/env'

try {
  readEnv()
} catch (e) {
  // Show the configuration problem instead of a blank page, then fail loudly.
  const root = document.getElementById('app')
  if (root) {
    root.innerHTML = '<p class="config-error" role="alert"></p>'
    root.firstElementChild!.textContent = (e as Error).message
  }
  throw e
}

// Loaded only after the env check: importing the app creates the Supabase client.
void import('./app').then(({ mountApp }) => mountApp('#app'))
