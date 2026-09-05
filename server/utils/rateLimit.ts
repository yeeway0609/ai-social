const WINDOW_MS = 60_000
const MAX_RENDER_UNITS_PER_WINDOW = 60

const buckets = new Map<string, { resetAtMs: number, usedCount: number }>()

/** serverless 各實例獨立計數；這是保護 demo 的粗粒度節流，不當作帳務配額。 */
export function consumeRenderRateLimit(userId: string, unitCount: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(userId)
  if (!bucket || bucket.resetAtMs <= now) {
    buckets.set(userId, { resetAtMs: now + WINDOW_MS, usedCount: unitCount })
    return unitCount <= MAX_RENDER_UNITS_PER_WINDOW
  }
  if (bucket.usedCount + unitCount > MAX_RENDER_UNITS_PER_WINDOW) return false
  bucket.usedCount += unitCount
  return true
}
