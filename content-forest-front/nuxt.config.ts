// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
  ],
  app: {
    head: {
      title: 'Content Forest — AI Content Evolution Engine',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Let your content evolve like life itself. Content Forest is an AI-powered content evolution engine built on evolutionary algorithms.' },
        { property: 'og:title', content: 'Content Forest — AI Content Evolution Engine' },
        { property: 'og:description', content: 'Let your content evolve like life itself.' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
})
