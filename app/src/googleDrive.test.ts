import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { backupDateFromName, buildMultipartBody, decideSync, driveBackupName, driveQ, pickFilesToPrune, shouldAutoDriveSync, sortBackups } from './googleDrive.ts'

describe('Google Drive (S4a): quy ước tên file & dọn bản cũ', () => {
  it('Tên file theo ngày địa phương, đọc lại được ngày', () => {
    assert.equal(driveBackupName(new Date(2026, 0, 5, 23, 59)), 'MoneySave-2026-01-05.json')
    assert.equal(backupDateFromName('MoneySave-2026-01-05.json'), '2026-01-05')
    assert.equal(backupDateFromName('MoneySave-SaoLuu.json'), null)
    assert.equal(backupDateFromName('ghi-chu.txt'), null)
  })
  it('Sắp xếp mới nhất trước, bỏ file lạ', () => {
    const files = [
      { id: 'a', name: 'MoneySave-2026-11-01.json' },
      { id: 'x', name: 'anh-cua-toi.jpg' },
      { id: 'c', name: 'MoneySave-2026-11-16.json' },
      { id: 'b', name: 'MoneySave-2026-11-10.json' },
    ]
    assert.deepEqual(sortBackups(files).map(f => f.id), ['c', 'b', 'a'])
  })
  it('Chỉ xoá bản cũ vượt quá số lượng giữ lại; không bao giờ xoá file không đúng quy ước', () => {
    const files = Array.from({ length: 33 }, (_, i) => ({ id: `f${i}`, name: `MoneySave-2026-10-${String(i + 1).padStart(2, '0')}.json` }))
      .slice(0, 31)
      .concat([{ id: 'odd', name: 'MoneySave-SaoLuu.json' }])
    const pruned = pickFilesToPrune(files, 30)
    assert.deepEqual(pruned, ['f0'])
    assert.deepEqual(pickFilesToPrune(files.slice(0, 5), 30), [])
    assert.ok(!pickFilesToPrune(files, 0).includes('odd'))
  })
  it('Thân multipart đúng định dạng; escape truy vấn', () => {
    const body = buildMultipartBody({ name: 'x.json' }, '{"a":1}', 'B')
    assert.equal(body, '--B\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"x.json"}\r\n--B\r\nContent-Type: application/json\r\n\r\n{"a":1}\r\n--B--')
    assert.equal(driveQ("Bob's \\ dir"), "Bob\\'s \\\\ dir")
  })
})

describe('S4b: decideSync – đồng bộ Drive nhiều máy', () => {
  const me = 'A'
  const remote = (updatedAt: number, deviceId = 'B', txCount = 5) => ({ updatedAt, deviceId, txCount })
  const local = (lastSync: number, localMut: number, hasData = true) => ({ lastSync, localMut, deviceId: me, hasData })

  it('chưa có file trên Drive: có dữ liệu → đẩy; máy trống → không làm gì', () => {
    assert.equal(decideSync(null, local(0, 0, true)), 'push')
    assert.equal(decideSync(null, local(0, 0, false)), 'noop')
  })
  it('lần đầu máy này đồng bộ: máy trống → kéo về; cả hai có dữ liệu → hỏi người dùng; Drive trống → đẩy', () => {
    assert.equal(decideSync(remote(100), local(0, 0, false)), 'pull')
    assert.equal(decideSync(remote(100), local(0, 50, true)), 'conflict')
    assert.equal(decideSync(remote(100, 'B', 0), local(0, 50, true)), 'push')
  })
  it('máy khác cập nhật sau lần đồng bộ cuối và máy này không sửa mới hơn → kéo về', () => {
    assert.equal(decideSync(remote(200), local(100, 90)), 'pull')
  })
  it('máy này sửa mới hơn → đẩy lên', () => {
    assert.equal(decideSync(remote(100), local(100, 150)), 'push')
  })
  it('cả hai bên cùng sửa từ lần đồng bộ cuối → hỏi người dùng (không tự bỏ phần sửa của bên nào)', () => {
    assert.equal(decideSync(remote(200), local(100, 250)), 'conflict')
    assert.equal(decideSync(remote(200), local(100, 150)), 'conflict')
  })
  it('bản trên Drive do chính máy này đẩy → không kéo lại', () => {
    assert.equal(decideSync(remote(200, me), local(100, 90)), 'noop')
  })
  it('không ai đổi gì → không làm gì', () => {
    assert.equal(decideSync(remote(100), local(100, 100)), 'noop')
  })
})


describe('S4b-2: shouldAutoDriveSync – tự đồng bộ ngầm', () => {
  it('chỉ chạy khi bật công tắc + có mã Google còn hạn + có mạng (không bao giờ bật popup ngầm)', () => {
    assert.equal(shouldAutoDriveSync({ on: true, hasToken: true, online: true }), true)
    assert.equal(shouldAutoDriveSync({ on: false, hasToken: true, online: true }), false)
    assert.equal(shouldAutoDriveSync({ on: true, hasToken: false, online: true }), false)
    assert.equal(shouldAutoDriveSync({ on: true, hasToken: true, online: false }), false)
  })
})
