import process from 'node:process'

export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },
  srcDir: 'app',
  css: ['~/assets/styles/workbench.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001',
    },
  },
  typescript: {
    strict: true,
  },
})
