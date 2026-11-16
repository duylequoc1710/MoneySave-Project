import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { backupDateFromName, buildMultipartBody, driveBackupName, driveQ, pickFilesToPrune, sortBackups } from './googleDrive.ts'

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
