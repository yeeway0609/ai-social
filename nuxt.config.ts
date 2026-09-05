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
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
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
      // 逗號分隔多把金鑰輪替；單把的 nvidiaApiKey 仍相容
      nvidiaApiKeys: '',
      nvidiaApiKey: '',
      model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
      embeddingModel: 'nvidia/nemotron-3-embed-1b',
      temperature: 0.3
    },

    public: {
      environment: 'local'
    }
  },

  devServer: {
    port: 3000
  },

  compatibilityDate: '2025-01-15',

  // 背景預產（waitUntil）跟著函式一起被砍，預設 10 秒不夠一次改寫加 embedding
  nitro: {
    vercel: {
      functions: { maxDuration: 60 }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
