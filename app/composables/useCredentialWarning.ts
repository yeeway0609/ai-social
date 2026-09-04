/** 任何一則改寫因沒金鑰而退回原文時亮起，提示讀者去設定頁填自備金鑰。 */
export function useCredentialWarning() {
  const isVisible = useState('credential-warning', () => false)
  return {
    isVisible,
    show: () => { isVisible.value = true },
    dismiss: () => { isVisible.value = false }
  }
}
