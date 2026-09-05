export type CredentialWarningKind = 'missing' | 'authenticationFailed' | 'rateLimited'

const CREDENTIAL_WARNING_CONTENT: Record<CredentialWarningKind, { title: string, description: string }> = {
  missing: {
    title: '未設定可用金鑰，目前顯示原文',
    description: '到設定頁填入你自己的 API 金鑰，或等共用池恢復後再重試。'
  },
  authenticationFailed: {
    title: 'API 金鑰驗證失敗，目前顯示原文',
    description: '請到設定頁確認金鑰是否仍有效，或改用另一組可用金鑰後再重試。'
  },
  rateLimited: {
    title: 'API 額度暫時受限，目前顯示原文',
    description: '請稍後重試，或到設定頁改用另一組仍有額度的金鑰。'
  }
}

/** 任何一則改寫因金鑰問題退回原文時亮起，讓讀者知道下一步該做什麼。 */
export function useCredentialWarning() {
  const isVisible = useState('credential-warning', () => false)
  const kind = useState<CredentialWarningKind>('credential-warning-kind', () => 'missing')
  const content = computed(() => CREDENTIAL_WARNING_CONTENT[kind.value])

  return {
    isVisible,
    title: computed(() => content.value.title),
    description: computed(() => content.value.description),
    show: (nextKind: CredentialWarningKind = 'missing') => {
      kind.value = nextKind
      isVisible.value = true
    },
    dismiss: () => { isVisible.value = false }
  }
}
