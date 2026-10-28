import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import DatePickerModal from './DatePickerModal'

export interface DateInputProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  showDayOfWeek?: boolean
  disabled?: boolean
  required?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * DateInput: Đồng bộ chuẩn UI in-app thống nhất toàn hệ thống.
 * Không dùng UI date picker mặc định của trình duyệt/hệ điều hành (vốn quá to và sáng chói),
 * mà mở Custom In-App DatePickerModal tinh gọn, chuẩn theme MoneySave.
 */
export default function DateInput({
  value,
  onChange,
  showDayOfWeek = true,
  disabled = false,
  className = '',
  style,
}: DateInputProps) {
  const [showModal, setShowModal] = useState(false)

  let formattedDate = value || 'Chọn ngày'
  let dayOfWeek = ''

  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    try {
      const parsed = parseISO(value)
      formattedDate = format(parsed, 'dd/MM/yyyy')
      if (showDayOfWeek) {
        const dow = format(parsed, 'EEEE', { locale: vi })
        dayOfWeek = dow.charAt(0).toUpperCase() + dow.slice(1)
      }
    } catch {
      formattedDate = value
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setShowModal(true)
    }
  }

  return (
    <>
      <div
        className={`date-input-unified ${className}`}
        style={{ ...style, cursor: disabled ? 'not-allowed' : 'pointer' }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Chọn ngày giao dịch"
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            if (!disabled) setShowModal(true)
          }
        }}
      >
        <div className="date-input-display">
          <span className="date-input-icon">📅</span>
          <span className="date-input-value">{formattedDate}</span>
          {dayOfWeek && <span className="date-input-dow">({dayOfWeek})</span>}
        </div>
        <span className="date-input-arrow">›</span>
      </div>

      {showModal && (
        <DatePickerModal
          value={value}
          onChange={val => {
            onChange(val)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
