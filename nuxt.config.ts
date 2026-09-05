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

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    storageKey: 'ai-social-color-mode'
  },

  runtimeConfig: {
    // 加密使用者自備金鑰用的對稱金鑰；缺值時「自備金鑰」功能整條停用（見 server/utils/crypto.ts）
    credentialSecret: '',
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

    // 預產改寫的管理端點用；空字串代表端點關閉
    adminSecret: '',

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
