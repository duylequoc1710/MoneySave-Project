import { useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

export interface DateInputProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  showDayOfWeek?: boolean
  disabled?: boolean
  required?: boolean
  min?: string
  max?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * DateInput: Đồng bộ định dạng ngày chuẩn dd/MM/yyyy trên toàn bộ thiết bị (iOS & Android).
 *
 * Lý do: Thẻ <input type="date"> mặc định hiển thị theo locale của HĐH thiết bị (iOS hiển thị tiếng Anh dạng
 * "1 Aug 2026", Android hiển thị "08/01/2026" hoặc theo máy).
 * Component này overlay một giao diện thuần tiếng Việt hiển thị chính xác dd/MM/yyyy (ví dụ: 17/10/2026 - Thứ Bảy)
 * đồng thời giữ nguyên picker gốc mượt mà của hệ điều hành khi người dùng chạm vào.
 */
export default function DateInput({
  value,
  onChange,
  showDayOfWeek = true,
  disabled = false,
  required = false,
  min,
  max,
  className = '',
  style,
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleClick = () => {
    if (inputRef.current && typeof inputRef.current.showPicker === 'function') {
      try {
        inputRef.current.showPicker()
      } catch {
        // Fallback: input overlays completely so native touch handles it
      }
    }
  }

  return (
    <div
      className={`date-input-unified ${className}`}
      style={style}
      onClick={handleClick}
    >
      <div className="date-input-display">
        <span className="date-input-icon">📅</span>
        <span className="date-input-value">{formattedDate}</span>
        {dayOfWeek && <span className="date-input-dow">({dayOfWeek})</span>}
      </div>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={e => {
          if (e.target.value) {
            onChange(e.target.value)
          }
        }}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        className="date-input-native"
        tabIndex={0}
        aria-label="Chọn ngày"
      />
    </div>
  )
}
