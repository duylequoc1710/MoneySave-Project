import Dexie, { type Table } from 'dexie'

/**
 * Bản sao an toàn tự động (Safety Snapshots).
 * Lưu trong một IndexedDB RIÊNG (`moneysave_safety`) – hoàn toàn tách biệt với CSDL chính,
 * nên không ảnh hưởng schema/dữ liệu thật. Chỉ giữ MAX_SNAPSHOTS bản mới nhất.
 */
/**
 * Loại bản sao:
 * - `daily`: tự động hằng ngày – mỗi ngày tối đa 1 bản.
 * - `sync`: trước khi đồng bộ Cloud ghi đè – mỗi ngày tối đa 1 bản (bản sau ghi đè bản trước trong cùng ngày),
 *   tránh sinh hàng loạt bản rời rạc khi đồng bộ nhiều lần/ngày.
 * - `event`: trước Khôi phục file / Xoá sạch / Nạp dữ liệu mẫu – luôn tạo bản mới.
 * Bản cũ (trước v2.9) không có `kind` → coi như `event`, không bị gộp/xoá khi nâng cấp.
 */
export type SnapshotKind = 'daily' | 'sync' | 'event'

export interface SafetySnapshot {
  id?: number
  createdAt: number
  reason: string
  txCount: number
  fundCount: number
  json: string
  kind?: SnapshotKind
}

const MAX_SNAPSHOTS = 15

class SafetyDB extends Dexie {
  snapshots!: Table<SafetySnapshot, number>
  kv!: Table<{ key: string; value: unknown }, string>
  constructor() {
    super('moneysave_safety')
    this.version(1).stores({ snapshots: '++id, createdAt' })
    // v2: chỉ THÊM bảng kv (lưu "file sao lưu đã chọn" trên máy tính) – không đụng tới snapshots.
    this.version(2).stores({ snapshots: '++id, createdAt', kv: 'key' })
  }
}

let safetyDb: SafetyDB | null = null
const sdb = () => (safetyDb ??= new SafetyDB())

const localDayKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * Hàm thuần: quyết định ghi bản sao mới hay ghi đè bản cùng loại trong cùng ngày.
 * Trả về id bản cần ghi đè, hoặc null nếu cần thêm bản mới.
 */
export function pickSnapshotToReplace(
  existing: Pick<SafetySnapshot, 'id' | 'createdAt' | 'kind'>[],
  kind: SnapshotKind,
  now: number,
): number | null {
  if (kind === 'event') return null
  const today = localDayKey(now)
  const same = existing.find(s => s.kind === kind && s.id != null && localDayKey(s.createdAt) === today)
  return same?.id ?? null
}

const stripExportedAt = (j: string) => j.replace(/"exportedAt":\s*"[^"]*"/, '')

/** Lưu một bản sao. Không bao giờ ném lỗi ra ngoài để không chặn thao tác chính. */
export async function saveSafetySnapshot(json: string, reason: string, kind: SnapshotKind = 'event'): Promise<void> {
  try {
    const d = JSON.parse(json)
    const txCount = Array.isArray(d.txs) ? d.txs.length : 0
    const fundCount = Array.isArray(d.funds) ? d.funds.length : 0
    if (txCount === 0 && fundCount === 0) return // không có gì đáng lưu
    const last = await sdb().snapshots.orderBy('createdAt').last()
    // Bỏ qua nếu nội dung không đổi so với bản gần nhất (không tính exportedAt)
    if (last && stripExportedAt(last.json) === stripExportedAt(json)) return
    const now = Date.now()
    const all = await sdb().snapshots.toArray()
    const replaceId = pickSnapshotToReplace(all, kind, now)
    const rec: SafetySnapshot = { createdAt: now, reason, txCount, fundCount, json, kind }
    if (replaceId != null) await sdb().snapshots.put({ ...rec, id: replaceId })
    else await sdb().snapshots.add(rec)
    const keys = await sdb().snapshots.orderBy('createdAt').primaryKeys()
    if (keys.length > MAX_SNAPSHOTS) await sdb().snapshots.bulkDelete(keys.slice(0, keys.length - MAX_SNAPSHOTS))
  } catch {
    /* bỏ qua */
  }
}

/** Mỗi ngày tự lưu tối đa 1 bản (nếu bản gần nhất đã quá 24 giờ). Không bao giờ ném lỗi. */
export async function ensureDailySnapshot(getJson: () => Promise<string>): Promise<void> {
  try {
    const last = await sdb().snapshots.orderBy('createdAt').last()
    if (last && Date.now() - last.createdAt < 24 * 3600 * 1000) return
    await saveSafetySnapshot(await getJson(), 'Tự động hằng ngày', 'daily')
  } catch {
    /* bỏ qua */
  }
}

/** Lưu/đọc giá trị phụ (vd. FileSystemFileHandle của file sao lưu trên máy tính). */
export async function kvGet<T>(key: string): Promise<T | undefined> {
  try {
    return (await sdb().kv.get(key))?.value as T | undefined
  } catch {
    return undefined
  }
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  try {
    await sdb().kv.put({ key, value })
  } catch {
    /* ignore */
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
