import Dexie, { type Table } from 'dexie'

/**
 * Bản sao an toàn tự động (Safety Snapshots).
 * Lưu trong một IndexedDB RIÊNG (`moneysave_safety`) – hoàn toàn tách biệt với CSDL chính,
 * nên không ảnh hưởng schema/dữ liệu thật. Chỉ giữ MAX_SNAPSHOTS bản mới nhất.
 */
export interface SafetySnapshot {
  id?: number
  createdAt: number
  reason: string
  txCount: number
  fundCount: number
  json: string
}

const MAX_SNAPSHOTS = 15

class SafetyDB extends Dexie {
  snapshots!: Table<SafetySnapshot, number>
  constructor() {
    super('moneysave_safety')
    this.version(1).stores({ snapshots: '++id, createdAt' })
  }
}

let safetyDb: SafetyDB | null = null
const sdb = () => (safetyDb ??= new SafetyDB())

/** Lưu một bản sao. Không bao giờ ném lỗi ra ngoài để không chặn thao tác chính. */
export async function saveSafetySnapshot(json: string, reason: string): Promise<void> {
  try {
    const d = JSON.parse(json)
    const txCount = Array.isArray(d.txs) ? d.txs.length : 0
    const fundCount = Array.isArray(d.funds) ? d.funds.length : 0
    if (txCount === 0 && fundCount === 0) return // không có gì đáng lưu
    const last = await sdb().snapshots.orderBy('createdAt').last()
    if (last) {
      // Bỏ qua nếu nội dung không đổi so với bản gần nhất (không tính exportedAt)
      const strip = (j: string) => j.replace(/"exportedAt":\s*"[^"]*"/, '')
      if (strip(last.json) === strip(json)) return
    }
    await sdb().snapshots.add({ createdAt: Date.now(), reason, txCount, fundCount, json })
    const all = await sdb().snapshots.orderBy('createdAt').primaryKeys()
    if (all.length > MAX_SNAPSHOTS) await sdb().snapshots.bulkDelete(all.slice(0, all.length - MAX_SNAPSHOTS))
  } catch {
    /* bỏ qua */
  }
}

/** Mỗi ngày tự lưu tối đa 1 bản (nếu bản gần nhất đã quá 24 giờ). Không bao giờ ném lỗi. */
export async function ensureDailySnapshot(getJson: () => Promise<string>): Promise<void> {
  try {
    const last = await sdb().snapshots.orderBy('createdAt').last()
    if (last && Date.now() - last.createdAt < 24 * 3600 * 1000) return
    await saveSafetySnapshot(await getJson(), 'Tự động hằng ngày')
  } catch {
    /* bỏ qua */
  }
}

export async function listSafetySnapshots(): Promise<SafetySnapshot[]> {
  try {
    return (await sdb().snapshots.orderBy('createdAt').reverse().toArray()).map(s => ({ ...s }))
  } catch {
    return []
  }
}

export async function deleteSafetySnapshot(id: number): Promise<void> {
  await sdb().snapshots.delete(id)
}

// ---- Nhắc sao lưu file JSON định kỳ ----
const LAST_BACKUP_KEY = 'moneysave_last_backup_at'
const SNOOZE_KEY = 'moneysave_backup_snooze_until'
export const BACKUP_REMIND_DAYS = 7

export function markBackupDownloaded() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
    localStorage.removeItem(SNOOZE_KEY)
  } catch {
    /* ignore */
  }
}

export function snoozeBackupReminder(days = 3) {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 86400000))
  } catch {
    /* ignore */
  }
}

/** Trả về số ngày kể từ lần sao lưu cuối (null nếu chưa từng) khi cần nhắc; undefined nếu chưa cần. */
export function backupReminderState(now = Date.now()): { daysSince: number | null } | undefined {
  try {
    const snooze = Number(localStorage.getItem(SNOOZE_KEY) ?? 0)
    if (snooze > now) return undefined
    const last = Number(localStorage.getItem(LAST_BACKUP_KEY) ?? 0)
    if (!last) return { daysSince: null }
    const days = Math.floor((now - last) / 86400000)
    return days >= BACKUP_REMIND_DAYS ? { daysSince: days } : undefined
  } catch {
    return undefined
  }
}
