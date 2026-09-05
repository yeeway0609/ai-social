/** 只存在這個瀏覽器的自備金鑰；平台不保存，換裝置或清除瀏覽資料就要重填。 */
export interface OwnCredential {
  provider: AiProvider
  apiKey: string
}

const STORAGE_KEY = 'ai-social-own-credential'

function read(): OwnCredential | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<OwnCredential>
    return isAiProvider(parsed.provider) && typeof parsed.apiKey === 'string' && parsed.apiKey ? { provider: parsed.provider, apiKey: parsed.apiKey } : null
  } catch {
    return null
  }
}

/**
 * 自備金鑰的唯一存放處是 localStorage；伺服器只在每次請求的標頭裡看到它、用完即丟。
 * 這是刻意的信任邊界：平台方拿不到使用者的金鑰，也就不可能代替使用者使用。
 */
export function useOwnCredential() {
  const credential = useState<OwnCredential | null>('own-credential', () => null)

  onMounted(() => {
    credential.value = read()
  })

  function save(next: OwnCredential) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    credential.value = next
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY)
    credential.value = null
  }

  const hint = computed(() => credential.value ? credential.value.apiKey.slice(-4) : null)
  const hasOwnCredential = computed(() => credential.value !== null)

  return {
    credential,
    hint,
    hasOwnCredential,
    save,
    clear
  }
}

/** 給 $fetch 攔截器用：從 localStorage 直接讀，不依賴元件生命週期。 */
export function ownCredentialHeaders(): Record<string, string> {
  const credential = read()
  return credential ? { 'x-ai-provider': credential.provider, 'x-ai-key': credential.apiKey } : {}
}
