import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

// Giả lập localStorage + người dùng đã đăng nhập TRƯỚC khi nạp module
const mem = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
} as unknown as Storage
mem.set(
  'moneysave_auth_user_v1',
  JSON.stringify({ uid: 'U1', email: 'a@b.c', idToken: 'TOKEN', refreshToken: 'R', expiresAt: Date.now() + 3600_000 }),
)

// Giả lập Firebase Realtime Database (REST)
const store = new Map<string, unknown>() // path (vd. "moneysave_users/U1") -> JSON
let rulesEnabled = false
const calls: string[] = []
const getPath = (path: string): unknown => {
  if (store.has(path)) return store.get(path)
  const [root, key, sub] = path.split('/')
  const parent = store.get(`${root}/${key}`) as Record<string, unknown> | undefined
  return sub && parent ? (parent[sub] ?? null) : null
}
;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: string, init?: RequestInit) => {
  const u = new URL(input)
  const path = decodeURIComponent(u.pathname.replace(/^\//, '').replace(/\.json$/, ''))
  const method = init?.method ?? 'GET'
  calls.push(`${method} ${path}`)
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  if (path.startsWith('moneysave_users/')) {
    if (!rulesEnabled || u.searchParams.get('auth') !== 'TOKEN') return json(401, { error: 'Permission denied' })
    const base = path.split('/').slice(0, 2).join('/')
    if (method === 'GET') return json(200, getPath(path))
    if (method === 'PATCH') {
      store.set(base, { ...((store.get(base) as object) ?? {}), ...JSON.parse(String(init?.body)) })
      return json(200, {})
    }
  }
  if (path.startsWith('moneysave_vaults/')) {
    if (method === 'GET') return json(200, store.get(path) ?? null)
    if (method === 'PUT') {
      store.set(path, JSON.parse(String(init?.body)))
      return json(200, {})
    }
  }
  return json(404, null)
}) as unknown as typeof fetch

type CS = typeof import('./cloudSync.ts')
let cs: CS

describe('Két bảo mật theo tài khoản (S3) – chuyển đổi an toàn', () => {
  before(async () => {
    cs = await import('./cloudSync.ts')
  })

  it('Rule mới CHƯA bật → tiếp tục dùng két cũ (đồng bộ không gián đoạn)', async () => {
    const cfg = cs.getActiveCloudSyncConfig()
    assert.equal(cfg.syncId, 'usr_U1')
    const payload = await cs.encryptVault('{"app":"MoneyGo","funds":[],"txs":[]}', cfg.passphrase, 'devA', 1000)
    await cs.pushEncryptedVaultToRemote(cfg, payload)
    assert.equal(cs.getAccountVaultMode(), 'legacy')
    const legacyKey = [...store.keys()].find(k => k.startsWith('moneysave_vaults/'))
    assert.ok(legacyKey, 'đã ghi vào két cũ')
    const meta = await cs.fetchRemoteMeta(cfg)
    assert.equal(meta?.updatedAt, 1000)
  })

  it('Bật rule → két mới trống được SAO CHÉP từ két cũ; két cũ vẫn còn nguyên', async () => {
    rulesEnabled = true
    cs.resetAccountVaultModeCache()
    const cfg = cs.getActiveCloudSyncConfig()
    const legacyKey = [...store.keys()].find(k => k.startsWith('moneysave_vaults/'))!
    const legacyBefore = JSON.stringify(store.get(legacyKey))
    const meta = await cs.fetchRemoteMeta(cfg)
    assert.equal(cs.getAccountVaultMode(), 'secure')
    assert.equal(meta?.updatedAt, 1000)
    assert.equal(meta?.vault, undefined, 'két bảo mật chỉ tải meta (nhẹ)')
    const secure = store.get('moneysave_users/U1') as { vault: { ciphertext: string } }
    assert.equal(secure.vault.ciphertext, (store.get(legacyKey) as { ciphertext: string }).ciphertext)
    assert.equal(JSON.stringify(store.get(legacyKey)), legacyBefore, 'két cũ không bị đổi/xoá')
    // Giải mã được bản sao từ két bảo mật
    const v = await cs.fetchRemoteVault(cfg)
    assert.equal(await cs.decryptVault(v!, cfg.passphrase), '{"app":"MoneyGo","funds":[],"txs":[]}')
  })

  it('Sau khi chuyển: ghi vào két bảo mật (vault + meta cùng lúc), không ghi két cũ nữa', async () => {
    const cfg = cs.getActiveCloudSyncConfig()
    calls.length = 0
    const p2 = await cs.encryptVault('{"app":"MoneyGo","funds":[{}],"txs":[]}', cfg.passphrase, 'devB', 2000)
    await cs.pushEncryptedVaultToRemote(cfg, p2)
    assert.ok(calls.every(c => !c.includes('moneysave_vaults')), 'không đụng két cũ')
    const meta = await cs.fetchRemoteMeta(cfg)
    assert.deepEqual({ u: meta?.updatedAt, d: meta?.deviceId }, { u: 2000, d: 'devB' })
  })

  it('Thiết bị còn chạy bản cũ ghi vào két cũ mới hơn → lượt đồng bộ đầy đủ sẽ nhận bản đó', async () => {
    const cfg = cs.getActiveCloudSyncConfig()
    const legacyKey = [...store.keys()].find(k => k.startsWith('moneysave_vaults/'))!
    const old = await cs.encryptVault('{"app":"MoneyGo","funds":[{},{}],"txs":[]}', cfg.passphrase, 'oldDevice', 3000)
    store.set(legacyKey, old)
    const quick = await cs.fetchRemoteMeta(cfg) // kiểm tra nhẹ: không xem két cũ
    assert.equal(quick?.updatedAt, 2000)
    const full = await cs.fetchRemoteMeta(cfg, { checkLegacyNewer: true })
    assert.equal(full?.updatedAt, 3000)
    assert.equal((store.get('moneysave_users/U1') as { meta: { updatedAt: number } }).meta.updatedAt, 3000)
  })

  it('Máy đã dùng két bảo mật mà bị từ chối (hết phiên) → báo lỗi, KHÔNG ghi ngược vào két cũ', async () => {
    const cfg = cs.getActiveCloudSyncConfig()
    rulesEnabled = false // mô phỏng bị từ chối
    cs.resetAccountVaultModeCache()
    calls.length = 0
    const p = await cs.encryptVault('{"app":"MoneyGo","funds":[],"txs":[]}', cfg.passphrase, 'devC', 4000)
    await assert.rejects(() => cs.pushEncryptedVaultToRemote(cfg, p), /đăng nhập lại/)
    assert.ok(calls.every(c => !c.startsWith('PUT moneysave_vaults')), 'không ghi két cũ')
  })
})
