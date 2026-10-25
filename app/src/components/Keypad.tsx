import { useEffect } from 'react'
import { evaluateKeypadExpression } from '../lib'

interface KeypadProps {
  value: string
  onChange: (val: string) => void
  onDone: () => void
  suggestions?: number[]
}

export default function Keypad({
  value,
  onChange,
  onDone,
  suggestions = [50000, 100000, 200000, 500000],
}: KeypadProps) {
  const handleKeyPress = (btn: string) => {
    if (btn === 'C') {
      onChange('0')
      return
    }

    if (btn === '⌫') {
      if (!value || value.length <= 1) {
        onChange('0')
      } else {
        onChange(value.slice(0, -1))
      }
      return
    }

    if (btn === '000') {
      // Chỉ thêm 000 nếu phần số hiện tại chưa có dấu thập phân
      const parts = value.split(/[+\-×÷*/]/)
      const curPart = parts[parts.length - 1] ?? ''
      if (!curPart.includes('.') && curPart !== '' && curPart !== '0') {
        onChange(value + '000')
      }
      return
    }

    if (btn === '.') {
      const parts = value.split(/[+\-×÷*/]/)
      const curPart = parts[parts.length - 1] ?? ''
      if (!curPart.includes('.')) {
        if (!curPart) {
          onChange(value + '0.')
        } else {
          onChange(value + '.')
        }
      }
      return
    }

    if (['+', '-', '×', '÷'].includes(btn)) {
      if (!value || value === '0') return
      const lastChar = value.slice(-1)
      if (['+', '-', '×', '÷'].includes(lastChar)) {
        // Đổi toán tử nếu vừa bấm toán tử khác
        onChange(value.slice(0, -1) + btn)
      } else {
        onChange(value + btn)
      }
      return
    }

    // Các chữ số 0-9
    if (/^[0-9]$/.test(btn)) {
      if (value === '0' || !value) {
        onChange(btn)
      } else {
        onChange(value + btn)
      }
    }
  }

  const handleDone = () => {
    const evaluated = evaluateKeypadExpression(value)
    onChange(String(evaluated))
    onDone()
  }

  // Bắt phím vật lý trên máy tính Desktop khi mở bàn phím
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Không can thiệp nếu người dùng đang nhập vào input khác (ví dụ: Ghi chú)
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.tagName === 'SELECT')
      ) {
        return
      }

      const key = e.key
      if (/^[0-9]$/.test(key)) {
        e.preventDefault()
        handleKeyPress(key)
      } else if (key === '.') {
        e.preventDefault()
        handleKeyPress('.')
      } else if (key === '+' || key === '-') {
        e.preventDefault()
        handleKeyPress(key)
      } else if (key === '*') {
        e.preventDefault()
        handleKeyPress('×')
      } else if (key === '/') {
        e.preventDefault()
        handleKeyPress('÷')
      } else if (key === 'Backspace') {
        e.preventDefault()
        handleKeyPress('⌫')
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        e.preventDefault()
        handleKeyPress('C')
      } else if (key === 'Enter') {
        e.preventDefault()
        handleDone()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [value])

  return (
    <div className="ml-keypad-container">
      {/* Hàng gợi ý số tiền nhanh */}
      {suggestions.length > 0 && (
        <div className="ml-keypad-chips">
          {suggestions.map(amt => (
            <button
              key={amt}
              type="button"
              className="ml-keypad-chip"
              onClick={() => onChange(String(amt))}
            >
              {amt.toLocaleString('en-US')}
            </button>
          ))}
        </div>
      )}

      {/* Lưới bàn phím máy tính 4x5 chuẩn MoneyLover */}
      <div className="ml-keypad-grid">
        <button
          type="button"
          className="ml-keypad-btn op-clear"
          onClick={() => handleKeyPress('C')}
        >
          C
        </button>
        <button
          type="button"
          className="ml-keypad-btn op"
          onClick={() => handleKeyPress('÷')}
        >
          ÷
        </button>
        <button
          type="button"
          className="ml-keypad-btn op"
          onClick={() => handleKeyPress('×')}
        >
          ×
        </button>
        <button
          type="button"
          className="ml-keypad-btn op-del"
          onClick={() => handleKeyPress('⌫')}
          aria-label="Xoá ký tự"
        >
          ⌫
        </button>

        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('7')}
        >
          7
        </button>
        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('8')}
        >
          8
        </button>
        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('9')}
        >
          9
        </button>
        <button
          type="button"
          className="ml-keypad-btn op"
          onClick={() => handleKeyPress('-')}
        >
          −
        </button>

        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('4')}
        >
          4
        </button>
        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('5')}
        >
          5
        </button>
        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('6')}
        >
          6
        </button>
        <button
          type="button"
          className="ml-keypad-btn op"
          onClick={() => handleKeyPress('+')}
        >
          +
        </button>

        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('1')}
        >
          1
        </button>
        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('2')}
        >
          2
        </button>
        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('3')}
        >
          3
        </button>
        <button
          type="button"
          className="ml-keypad-btn btn-xong"
          onClick={handleDone}
        >
          XONG
        </button>

        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('0')}
        >
          0
        </button>
        <button
          type="button"
          className="ml-keypad-btn num"
          onClick={() => handleKeyPress('000')}
        >
          000
        </button>
        <button
          type="button"
          className="ml-keypad-btn num dot"
          onClick={() => handleKeyPress('.')}
        >
          .
        </button>
      </div>
    </div>
  )
}
