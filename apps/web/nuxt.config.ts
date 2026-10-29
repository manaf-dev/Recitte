import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-25',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    public: {
      // NUXT_PUBLIC_SUPABASE_URL, NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NUXT_PUBLIC_SITE_URL
      supabaseUrl: '',
      supabasePublishableKey: '',
      siteUrl: '',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: "Recitte | Reconnecting with the Qur'an",
      meta: [
        {
          name: 'description',
          content:
            "Recitte helps Muslims build a consistent, meaningful daily connection with the Qur'an through community, learning and practical tools.",
        },
        { name: 'theme-color', content: '#202545' },
      ],
      link: [
        { rel: 'icon', href: '/images/recitte-mark.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },
})
