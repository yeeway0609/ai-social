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

    ai: {
      defaultProvider: 'anthropic',
      // 團隊共用池：逗號分隔的多把金鑰，執行期才切成陣列
      poolAnthropic: '',
      poolOpenai: '',
      poolOpenrouter: '',
      modelAnthropic: 'claude-haiku-4-5-20251001',
      modelOpenai: 'gpt-5-mini',
      modelOpenrouter: 'meta-llama/llama-3.3-70b-instruct:free',
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
