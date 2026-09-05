import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * 定時比對兩個祕密字串。先各自雜湊再比，長度不同也不會提前回傳——
 * timingSafeEqual 對長度不等的 buffer 會直接丟例外，那本身就洩漏了長度。
 */
export function secretEquals(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(a), digest(b))
}
