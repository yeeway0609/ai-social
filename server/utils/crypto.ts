import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * 定時比對兩個祕密字串。先各自雜湊再比，長度不同也不會提前回傳——
 * timingSafeEqual 對長度不等的 buffer 會直接丟例外，那本身就洩漏了長度。
 */
export function secretEquals(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(a), digest(b))
}

/** 加密後的封包；iv 與 authTag 一起存，換金鑰時舊資料就解不開（預期行為，等同失效）。 */
export interface SealedSecret {
  iv: string
  authTag: string
  ciphertext: string
}

function key() {
  const hex = useRuntimeConfig().credentialSecret
  if (!hex) throw new Error('NUXT_CREDENTIAL_SECRET 未設定，無法保管使用者自備金鑰')
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== 32) throw new Error('NUXT_CREDENTIAL_SECRET 必須是 32 bytes 的 hex（openssl rand -hex 32）')
  return buf
}

export function seal(plaintext: string): SealedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  }
}

export function unseal(sealed: SealedSecret): string {
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(sealed.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(sealed.authTag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, 'base64')),
    decipher.final()
  ]).toString('utf8')
}
