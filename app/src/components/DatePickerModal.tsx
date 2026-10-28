import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { ymd } from '../lib'

interface DatePickerModalProps {
  value: string // YYYY-MM-DD
  onChange: (val: string) => void
  onClose: () => void
}

export default function DatePickerModal({
  value,
  onChange,
  onClose,
}: DatePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(value) : new Date()
  )
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(selectedDate))
  const [today] = useState<Date>(() => new Date())

  // Xây dựng lưới lịch tháng
  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const daysInMonth = monthEnd.getDate()

  // Thứ 2 là 0, CN là 6 (theo chuẩn Việt Nam)
  const startDayOfWeek = (monthStart.getDay() + 6) % 7

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewMonth(prev => subMonths(prev, 1))
  }
  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewMonth(prev => addMonths(prev, 1))
  }

  const handleSelectDay = (day: number) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    setSelectedDate(next)
    onChange(ymd(next))
    onClose()
  }

  const handleQuickPick = (d: Date) => {
    setSelectedDate(d)
    setViewMonth(startOfMonth(d))
    onChange(ymd(d))
    onClose()
  }

  const formattedSelected = (() => {
    try {
      const raw = format(selectedDate, "EEEE, 'ngày' dd/MM/yyyy", { locale: vi })
      return raw.charAt(0).toUpperCase() + raw.slice(1)
    } catch {
      return format(selectedDate, 'dd/MM/yyyy')
    }
  })()

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="sheetbg"
      onClick={onClose}
      style={{ zIndex: 75 }}
    >
      <div
        className="sheet date-picker-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 420,
          margin: '0 auto',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Header Bar */}
        <div className="ml-tx-header" style={{ marginBottom: 10 }}>
          <button type="button" className="ml-tx-cancel-btn" onClick={onClose}>
            Huỷ
          </button>
          <div className="ml-tx-title">Chọn Ngày Giao Dịch</div>
          <div style={{ width: 50 }} />
        </div>

        {/* Hàng chọn nhanh: Hôm qua, Hôm nay, Ngày mai */}
        <div className="date-quick-chips">
          <button
            type="button"
            className="date-quick-chip"
            onClick={() => handleQuickPick(subDays(today, 1))}
          >
            Hôm qua
          </button>
          <button
            type="button"
            className="date-quick-chip highlight"
            onClick={() => handleQuickPick(today)}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className="date-quick-chip"
            onClick={() => handleQuickPick(addDays(today, 1))}
          >
            Ngày mai
          </button>
        </div>

        {/* Thanh chuyển tháng: < Tháng M, yyyy > */}
        <div className="date-month-nav">
          <button
            type="button"
            className="date-nav-arrow"
            onClick={handlePrevMonth}
            aria-label="Tháng trước"
          >
            ‹
          </button>
          <span className="date-month-title">
            {format(viewMonth, "'Tháng' M, yyyy", { locale: vi })}
          </span>
          <button
            type="button"
            className="date-nav-arrow"
            onClick={handleNextMonth}
            aria-label="Tháng sau"
          >
            ›
          </button>
        </div>

        {/* Bảng tuần: T2 - CN */}
        <div className="date-weekdays-grid">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(wd => (
            <div key={wd} className="date-weekday-cell">
              {wd}
            </div>
          ))}
        </div>

        {/* Lưới các ngày trong tháng */}
        <div className="date-days-grid">
          {/* Ô trống trước ngày 1 */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="date-day-cell empty" />
          ))}

          {/* Các ngày trong tháng */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1
            const curDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), dayNum)
            const isSelected = isSameDay(curDate, selectedDate)
            const isToday = isSameDay(curDate, today)

            return (
              <button
                key={dayNum}
                type="button"
                className={`date-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleSelectDay(dayNum)}
              >
                <span>{dayNum}</span>
              </button>
            )
          })}
        </div>

        {/* Chân trang hiển thị ngày đang chọn */}
        <div className="date-picker-footer">
          <div className="date-selected-preview">
            <span className="mut" style={{ fontSize: 12 }}>Đã chọn:</span>
            <b style={{ marginLeft: 6, color: 'var(--acc)' }}>
              {formattedSelected}
            </b>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
