import { useState } from 'react'
import { endOfMonth, startOfMonth } from 'date-fns'
import { type TimeFilter, type TimeRangeMode, ymd } from '../lib'
import DateInput from './DateInput'

interface Props {
  filter: TimeFilter
  onChange: (next: TimeFilter) => void
  onClose: () => void
}

const PRESETS: { mode: TimeRangeMode; icon: string; label: string; desc: string }[] = [
  { mode: 'month', icon: '📅', label: 'Theo tháng (Mặc định)', desc: 'Xem sổ giao dịch & báo cáo theo từng tháng' },
  { mode: 'today', icon: '📍', label: 'Hôm nay', desc: 'Chỉ lọc các giao dịch phát sinh trong ngày hôm nay' },
  { mode: 'week', icon: '📆', label: 'Tuần này', desc: 'Từ Thứ Hai đến Chủ Nhật của tuần hiện tại' },
  { mode: 'quarter', icon: '📊', label: 'Quý này', desc: 'Tổng hợp 3 tháng trong quý hiện tại' },
  { mode: 'year', icon: '🗓️', label: 'Năm nay', desc: 'Toàn bộ giao dịch từ 01/01 đến 31/12 năm nay' },
  { mode: 'all', icon: '♾️', label: 'Tất cả thời gian', desc: 'Hiển thị toàn bộ lịch sử giao dịch từ trước đến nay' },
]

export default function TimeRangeModal({ filter, onChange, onClose }: Props) {
  const [year, setYear] = useState(() => filter.month.getFullYear())
  const [startDate, setStartDate] = useState(
    () => filter.startDate || ymd(startOfMonth(filter.month)),
  )
  const [endDate, setEndDate] = useState(
    () => filter.endDate || ymd(endOfMonth(filter.month)),
  )

  function selectPreset(mode: TimeRangeMode) {
    if (mode === 'month') {
      const nowM = startOfMonth(new Date())
      onChange({
        mode: 'month',
        month: nowM,
        startDate: ymd(nowM),
        endDate: ymd(endOfMonth(nowM)),
      })
    } else {
      onChange({ ...filter, mode })
    }
    onClose()
  }

  function selectSpecificMonth(mIndex: number) {
    const target = new Date(year, mIndex, 1)
    onChange({
      mode: 'month',
      month: target,
      startDate: ymd(startOfMonth(target)),
      endDate: ymd(endOfMonth(target)),
    })
    onClose()
  }

  function applyCustomRange() {
    if (!startDate || !endDate) return
    onChange({
      ...filter,
      mode: 'custom',
      startDate,
      endDate,
    })
    onClose()
  }

  const curMonthIdx = filter.mode === 'month' && filter.month.getFullYear() === year ? filter.month.getMonth() : -1

  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="ledger-topbar" style={{ marginBottom: 14 }}>
          <button type="button" className="close-pill-btn" onClick={onClose}>
            Đóng
          </button>
          <b style={{ fontSize: 17 }}>Chọn khoảng thời gian</b>
          <span style={{ width: 64 }} />
        </div>

        {/* 1. TUỲ CHỈNH TỪ NGÀY - ĐẾN NGÀY */}
        <h2 style={{ margin: '4px 4px 8px' }}>🔍 LỌC THEO KHOẢNG NGÀY CỤ THỂ</h2>
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div className="fld" style={{ margin: 0 }}>
              <span>Từ ngày</span>
              <DateInput value={startDate} onChange={setStartDate} showDayOfWeek={false} />
            </div>
            <div className="fld" style={{ margin: 0 }}>
              <span>Đến ngày</span>
              <DateInput value={endDate} onChange={setEndDate} showDayOfWeek={false} />
            </div>
          </div>
          <button
            type="button"
            className="btn pri"
            style={{ width: '100%', padding: '10px 14px' }}
            onClick={applyCustomRange}
          >
            Áp dụng khoảng thời gian này
          </button>
        </div>

        {/* 2. CHỌN NHANH THÁNG / NĂM */}
        <h2 style={{ margin: '10px 4px 8px' }}>📅 CHỌN NHANH THÁNG TRONG NĂM</h2>
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <button type="button" className="btn" onClick={() => setYear(y => y - 1)}>
              ‹ {year - 1}
            </button>
            <b style={{ fontSize: 16 }}>Năm {year}</b>
            <button type="button" className="btn" onClick={() => setYear(y => y + 1)}>
              {year + 1} ›
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Array.from({ length: 12 }, (_, idx) => {
              const isCur = curMonthIdx === idx
              return (
                <button
                  key={idx}
                  type="button"
                  className={`btn ${isCur ? 'pri' : ''}`}
                  style={{ padding: '8px 4px', fontSize: 13, fontWeight: isCur ? 700 : 500 }}
                  onClick={() => selectSpecificMonth(idx)}
                >
                  Thg {idx + 1}
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. CÁC KHOẢNG THỜI GIAN ĐỊNH SẴN */}
        <h2 style={{ margin: '10px 4px 8px' }}>⚡ KHOẢNG THỜI GIAN NHANH</h2>
        <div className="card" style={{ padding: '2px 14px' }}>
          {PRESETS.map(p => {
            const isSel = filter.mode === p.mode
            return (
              <div
                key={p.mode}
                className="row"
                style={{ cursor: 'pointer' }}
                onClick={() => selectPreset(p.mode)}
              >
                <div className="ico round" style={{ background: 'color-mix(in srgb, var(--acc) 16%, transparent)' }}>
                  {p.icon}
                </div>
                <div className="grow">
                  <b style={{ fontSize: 15 }}>{p.label}</b>
                  <small>{p.desc}</small>
                </div>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isSel ? 'var(--acc)' : 'transparent',
                    border: isSel ? 'none' : '1.5px solid var(--bd)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {isSel ? '✓' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
