// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  app: {
    head: {
      title: '不痛 Tone',
      htmlAttrs: { lang: 'zh-Hant-TW' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#ffffff' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  runtimeConfig: {
    sessionSecret: '',
    adminSecret: '',

    ai: {
      nvidiaApiKey: '',
      model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
      embeddingModel: 'nvidia/nemotron-3-embed-1b',
      temperature: 1,
      // 沒有金鑰時的本機替身：改寫只是在原文前加語氣標記，讓 UI 流程走得通
      mock: false
    },

    public: {
      environment: 'local'
    }
  },

  devServer: {
    port: 3000
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
