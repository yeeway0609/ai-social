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
        { name: 'theme-color', content: '#141414' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },

  css: ['~/assets/css/main.css'],

  // 視覺語言固定為墨黑底，不跟隨系統
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    storageKey: 'ai-social-color-mode'
  },

  runtimeConfig: {
    sessionSecret: '',
    adminSecret: '',

    ai: {
      nvidiaApiKey: '',
      model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
      embeddingModel: 'nvidia/llama-3.2-nv-embedqa-1b-v2',
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
