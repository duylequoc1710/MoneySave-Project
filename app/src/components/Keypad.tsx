import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { evaluateKeypadExpression, formatKeypadDisplay } from '../lib'

interface KeypadProps {
  value: string
  onChange: (val: string) => void
  onDone: () => void
  suggestions?: number[]
  containerRef?: Ref<HTMLDivElement>
  allowNegative?: boolean
  portal?: boolean
  zIndex?: number
}

export default function Keypad({
  value,
  onChange,
  onDone,
  suggestions = [50000, 100000, 200000, 500000],
  containerRef,
  allowNegative = false,
  portal = false,
  zIndex = 10050,
}: KeypadProps) {
  const cleanVal = (value || '').replace(/,/g, '').trim()

  const handleKeyPress = (btn: string) => {
    if (btn === 'C') {
      onChange('0')
      return
    }

    if (btn === '⌫') {
      if (!cleanVal || cleanVal.length <= 1 || cleanVal === '-') {
        onChange('0')
      } else {
        onChange(cleanVal.slice(0, -1))
      }
      return
    }

    if (btn === '000') {
      const parts = cleanVal.split(/[+\-×÷*/]/)
      const curPart = parts[parts.length - 1] ?? ''
      if (!curPart.includes('.') && curPart !== '' && curPart !== '0') {
        onChange(cleanVal + '000')
      }
      return
    }

    if (btn === '.') {
      const parts = cleanVal.split(/[+\-×÷*/]/)
      const curPart = parts[parts.length - 1] ?? ''
      if (!curPart.includes('.')) {
        if (!curPart) {
          onChange((cleanVal === '0' ? '' : cleanVal) + '0.')
        } else {
          onChange(cleanVal + '.')
        }
      }
      return
    }

    if (['+', '-', '×', '÷'].includes(btn)) {
      if (!cleanVal || cleanVal === '0') {
        if (btn === '-' && allowNegative) {
          onChange('-')
        }
        return
      }
      if (cleanVal === '-') {
        if (btn === '+') onChange('0')
        return
      }
      const lastChar = cleanVal.slice(-1)
      if (['+', '-', '×', '÷'].includes(lastChar)) {
        onChange(cleanVal.slice(0, -1) + btn)
      } else {
        onChange(cleanVal + btn)
      }
      return
    }

    if (/^[0-9]$/.test(btn)) {
      if (cleanVal === '0' || !cleanVal) {
        onChange(btn)
      } else {
        onChange(cleanVal + btn)
      }
    }
  }

  const handleDone = () => {
    const evaluated = evaluateKeypadExpression(cleanVal)
    onChange(String(evaluated))
    onDone()
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanVal, onChange, onDone])

  const content = (
    <div
      className="ml-keypad-container"
      ref={containerRef}
      style={portal ? { zIndex } : undefined}
      onClick={e => e.stopPropagation()}
    >
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

  if (portal && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }
  return content
}

export interface NumericInputBoxProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  suffix?: string
  suggestions?: number[]
  allowNegative?: boolean
  allowZeroDisplay?: boolean
  minVal?: number
  maxVal?: number
  variant?: 'hero' | 'box' | 'field'
  color?: string
  style?: CSSProperties
  textStyle?: CSSProperties
  className?: string
  disabled?: boolean
}

/**
 * Ô nhập số đồng bộ toàn ứng dụng sử dụng bàn phím máy tính nội bộ (Keypad)
 * thay vì bàn phím mặc định của hệ điều hành. Không bao giờ tự động focus khi mở modal.
 */
export function NumericInputBox({
  value,
  onChange,
  placeholder = '0',
  suffix = '₫',
  suggestions = [50000, 100000, 200000, 500000],
  allowNegative = false,
  allowZeroDisplay = false,
  minVal,
  maxVal,
  variant = 'box',
  color,
  style,
  textStyle,
  className = '',
  disabled = false,
}: NumericInputBoxProps) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const keypadRef = useRef<HTMLDivElement>(null)

  const rawClean = (value ?? '').replace(/,/g, '').trim()
  const isEmpty = rawClean === '' || (!allowZeroDisplay && !open && rawClean === '0')
  const hasMathOp = /[+×÷*/]/.test(rawClean) || (rawClean.slice(1).includes('-'))
  const evaluated = evaluateKeypadExpression(rawClean)

  const finalizeAndClose = () => {
    if (rawClean !== '' && rawClean !== '-') {
      let num = evaluateKeypadExpression(rawClean)
      if (!allowNegative && num < 0) num = 0
      if (minVal !== undefined && num < minVal) num = minVal
      if (maxVal !== undefined && num > maxVal) num = maxVal
      onChange(num === 0 && !allowZeroDisplay ? '' : String(num))
    } else if (rawClean === '-') {
      onChange(allowZeroDisplay ? '0' : '')
    }
    setOpen(false)
  }

  // Thêm khoảng đệm dưới cho .sheet gần nhất khi bàn phím đang mở
  useEffect(() => {
    if (!open || !boxRef.current) return
    const sheetEl = boxRef.current.closest('.sheet') as HTMLElement | null
    if (sheetEl) {
      sheetEl.classList.add('kp-open')
      setTimeout(() => {
        boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 60)
      return () => {
        sheetEl.classList.remove('kp-open')
      }
    }
  }, [open])

  // Tự động đóng bàn phím khi click ra ngoài ô nhập và ngoài bàn phím
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (boxRef.current?.contains(target)) return
      if (keypadRef.current?.contains(target)) return
      finalizeAndClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rawClean])

  const displayStr = isEmpty ? placeholder : formatKeypadDisplay(rawClean)

  if (variant === 'hero') {
    return (
      <>
        <div
          ref={boxRef}
          className={`ml-amount-display-box ${open ? 'active' : ''} ${className}`.trim()}
          onClick={() => !disabled && setOpen(true)}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
        >
          <div
            className="ml-amount-display-text"
            style={{
              color: isEmpty ? 'var(--mut)' : (color || 'var(--fg)'),
              opacity: isEmpty ? 0.55 : 1,
              ...textStyle,
            }}
          >
            {displayStr}
            {open && <span className="ml-keypad-cursor" />}
          </div>
          {suffix && <span className="ml-amount-currency">{suffix}</span>}
        </div>
        {hasMathOp && (
          <div style={{ fontSize: 12, color: 'var(--mut)', textAlign: 'right', marginTop: 4 }}>
            = {evaluated.toLocaleString('en-US')} {suffix}
          </div>
        )}
        {open && (
          <Keypad
            containerRef={keypadRef}
            value={rawClean || '0'}
            onChange={val => onChange(val === '0' && !allowZeroDisplay ? '' : val)}
            onDone={finalizeAndClose}
            suggestions={suggestions}
            allowNegative={allowNegative}
            portal
          />
        )}
      </>
    )
  }

  const isField = variant === 'field'

  return (
    <>
      <div
        ref={boxRef}
        role="button"
        tabIndex={0}
        onClick={() => !disabled && setOpen(true)}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          padding: isField ? '11px 13px' : '13px 15px',
          borderRadius: isField ? 12 : 14,
          border: open ? '1.5px solid var(--acc)' : '1.5px solid var(--bd)',
          background: open
            ? 'color-mix(in srgb, var(--acc) 7%, var(--bg))'
            : 'color-mix(in srgb, var(--bg) 75%, #000)',
          boxShadow: open ? '0 0 0 3px color-mix(in srgb, var(--acc) 18%, transparent)' : 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
          ...style,
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: isField ? 15 : 21,
            fontWeight: isField ? 700 : 800,
            color: isEmpty ? 'var(--mut)' : (color || 'var(--fg)'),
            opacity: isEmpty ? 0.55 : 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: isField ? 0 : '-0.3px',
            ...textStyle,
          }}
        >
          {displayStr}
          {open && <span className="ml-keypad-cursor" style={{ height: isField ? 16 : 22 }} />}
        </div>
        {suffix && (
          <span
            style={{
              fontWeight: 700,
              color: 'var(--mut)',
              fontSize: isField ? 13 : 15,
              flexShrink: 0,
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      {hasMathOp && (
        <div style={{ fontSize: 12, color: 'var(--mut)', textAlign: 'right', marginTop: 4 }}>
          = {evaluated.toLocaleString('en-US')} {suffix}
        </div>
      )}
      {open && (
        <Keypad
          containerRef={keypadRef}
          value={rawClean || '0'}
          onChange={val => onChange(val === '0' && !allowZeroDisplay ? '' : val)}
          onDone={finalizeAndClose}
          suggestions={suggestions}
          allowNegative={allowNegative}
          portal
        />
      )}
    </>
  )
}
