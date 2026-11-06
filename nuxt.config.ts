// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    sqlitePath: process.env.SQLITE_DB_PATH || '.data/polysoko.sqlite'
  },
  modules: [
    '@nuxt/image',
    '@nuxt/icon',
    '@vueuse/nuxt',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@vite-pwa/nuxt'
  ]
})