const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function formatRelativeTime(iso: string, now = Date.now()) {
  const diff = now - new Date(iso).getTime()
  if (diff < MINUTE_MS) return '剛剛'
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)} 分鐘前`
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)} 小時前`
  if (diff < 7 * DAY_MS) return `${Math.floor(diff / DAY_MS)} 天前`
  const date = new Date(iso)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function formatClockTime(iso: string) {
  const date = new Date(iso)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const AVATAR_COLORS = ['bg-primary text-inverted', 'bg-pulse text-white', 'bg-[#c8a2ff] text-ink', 'bg-bone text-ink', 'bg-sky-700 text-bone', 'bg-ink-3 text-bone ring-1 ring-accented', 'bg-sky-200 text-ink', 'bg-[#b8264a] text-white']

/** 同一個 username 永遠拿到同一個顏色，沒有頭像圖也能一眼認人。 */
export function avatarColorFor(username: string) {
  let hash = 0
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!
}
