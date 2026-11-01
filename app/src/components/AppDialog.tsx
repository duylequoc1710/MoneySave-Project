import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type DialogTone = 'info' | 'success' | 'warning' | 'danger'

export interface AlertOptions {
  title?: string
  message: string
  icon?: string
  tone?: DialogTone
  confirmText?: string
}

export interface ConfirmOptions {
  title?: string
  message: string
  icon?: string
  tone?: DialogTone
  danger?: boolean
  confirmText?: string
  cancelText?: string
}

export interface PromptOptions {
  title: string
  message?: string
  icon?: string
  tone?: DialogTone
  defaultValue?: string
  placeholder?: string
  unit?: string
  numeric?: boolean
  quickAmounts?: number[]
  allowClearZero?: boolean
  clearText?: string
  confirmText?: string
  cancelText?: string
}

type InternalDialogItem =
  | {
      id: number
      kind: 'alert'
      options: AlertOptions
      resolve: () => void
    }
  | {
      id: number
      kind: 'confirm'
      options: ConfirmOptions
      resolve: (ok: boolean) => void
    }
  | {
      id: number
      kind: 'prompt'
      options: PromptOptions
      resolve: (val: string | null) => void
    }

let nextId = 1
const queue: InternalDialogItem[] = []
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(fn => fn())
}

function enqueue(item: InternalDialogItem) {
  queue.push(item)
  notify()
}

export function showAlert(opts: string | AlertOptions): Promise<void> {
  const options: AlertOptions =
    typeof opts === 'string' ? { message: opts } : opts
  return new Promise<void>(resolve => {
    enqueue({
      id: nextId++,
      kind: 'alert',
      options,
      resolve,
    })
  })
}

export function showConfirm(opts: string | ConfirmOptions): Promise<boolean> {
  const options: ConfirmOptions =
    typeof opts === 'string' ? { message: opts } : opts
  return new Promise<boolean>(resolve => {
    enqueue({
      id: nextId++,
      kind: 'confirm',
      options,
      resolve,
    })
  })
}

export function showPrompt(options: PromptOptions): Promise<string | null> {
  return new Promise<string | null>(resolve => {
    enqueue({
      id: nextId++,
      kind: 'prompt',
      options,
      resolve,
    })
  })
}

function formatNumericDisplay(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return ''
  const num = Number(digits)
  if (!Number.isFinite(num)) return ''
  return num.toLocaleString('en-US')
}

export function AppDialogHost() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const fn = () => setTick(t => t + 1)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])

  const current = queue[0] ?? null
  if (!current) return null

  return <ActiveDialog key={current.id} item={current} />
}

function ActiveDialog({ item }: { item: InternalDialogItem }) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const initialVal =
    item.kind === 'prompt'
      ? item.options.numeric
        ? formatNumericDisplay(item.options.defaultValue ?? '')
        : (item.options.defaultValue ?? '')
      : ''

  const [value, setValue] = useState(initialVal)

  useEffect(() => {
    if (item.kind === 'prompt') {
      const t = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 40)
      return () => clearTimeout(t)
    }
  }, [item.kind])

  const popAndResolve = (action: () => void) => {
    if (queue[0]?.id === item.id) {
      queue.shift()
    }
    action()
    notify()
  }

  const handleCancel = () => {
    if (item.kind === 'alert') {
      popAndResolve(() => item.resolve())
    } else if (item.kind === 'confirm') {
      popAndResolve(() => item.resolve(false))
    } else {
      popAndResolve(() => item.resolve(null))
    }
  }

  const handleConfirm = () => {
    if (item.kind === 'alert') {
      popAndResolve(() => item.resolve())
    } else if (item.kind === 'confirm') {
      popAndResolve(() => item.resolve(true))
    } else {
      const out = item.options.numeric ? value.replace(/[^\d]/g, '') : value
      popAndResolve(() => item.resolve(out))
    }
  }

  const handleClearZero = () => {
    if (item.kind === 'prompt') {
      popAndResolve(() => item.resolve('0'))
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleCancel()
      } else if (e.key === 'Enter' && item.kind !== 'prompt') {
        e.preventDefault()
        e.stopPropagation()
        handleConfirm()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const tone: DialogTone =
    item.kind === 'confirm' && item.options.danger
      ? 'danger'
      : (item.options.tone ??
        (item.kind === 'confirm'
          ? 'warning'
          : item.kind === 'prompt'
            ? 'info'
            : 'info'))

  const defaultIcon =
    tone === 'danger'
      ? '🗑️'
      : tone === 'warning'
        ? '⚠️'
        : tone === 'success'
          ? '✅'
          : item.kind === 'prompt'
            ? '🎯'
            : '💡'

  const icon = item.options.icon ?? defaultIcon
  const title =
    item.options.title ??
    (item.kind === 'confirm'
      ? tone === 'danger'
        ? 'Xác nhận xoá'
        : 'Xác nhận thao tác'
      : item.kind === 'alert'
        ? tone === 'danger'
          ? 'Không thể thực hiện'
          : tone === 'success'
            ? 'Thành công'
            : 'Thông báo'
        : 'Nhập thông tin')

  const accentColor =
    tone === 'danger'
      ? 'var(--exp)'
      : tone === 'warning'
        ? 'var(--warn)'
        : 'var(--acc)'

  const accentBg =
    tone === 'danger'
      ? 'rgba(255, 90, 95, 0.14)'
      : tone === 'warning'
        ? 'rgba(245, 166, 35, 0.14)'
        : 'rgba(45, 184, 76, 0.14)'

  return createPortal(
    <div
      className="sheetbg app-dialog-overlay"
      onClick={handleCancel}
      style={{
        zIndex: 110,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="app-dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 390,
          background: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--bd)',
          borderRadius: 22,
          padding: '22px 20px 18px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65)',
          animation: 'appDialogPop 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: accentBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
              border: `1px solid ${accentColor}33`,
            }}
          >
            {icon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              id="app-dialog-title"
              style={{
                fontWeight: 700,
                fontSize: 16.5,
                lineHeight: 1.3,
                color: 'var(--fg)',
              }}
            >
              {title}
            </div>
            <div
              className="mut"
              style={{ fontSize: 11.5, marginTop: 2, fontWeight: 500 }}
            >
              MoneySave
            </div>
          </div>
        </div>

        {item.options.message && (
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: 'var(--fg)',
              opacity: 0.92,
              whiteSpace: 'pre-line',
              marginBottom: item.kind === 'prompt' ? 14 : 18,
            }}
          >
            {item.options.message}
          </div>
        )}

        {item.kind === 'prompt' && (
          <form
            onSubmit={e => {
              e.preventDefault()
              handleConfirm()
            }}
            style={{ marginBottom: 4 }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                inputMode={item.options.numeric ? 'numeric' : 'text'}
                value={value}
                placeholder={item.options.placeholder ?? ''}
                onChange={e => {
                  const v = e.target.value
                  if (item.options.numeric) {
                    setValue(formatNumericDisplay(v))
                  } else {
                    setValue(v)
                  }
                }}
                style={{
                  width: '100%',
                  padding: item.options.unit
                    ? '12px 42px 12px 14px'
                    : '12px 14px',
                  fontSize: item.options.numeric ? 18 : 15,
                  fontWeight: item.options.numeric ? 700 : 500,
                  borderRadius: 14,
                  border: '1.5px solid var(--acc)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  outline: 'none',
                }}
              />
              {item.options.unit && (
                <span
                  style={{
                    position: 'absolute',
                    right: 14,
                    fontWeight: 700,
                    fontSize: 15,
                    color: 'var(--mut)',
                    pointerEvents: 'none',
                  }}
                >
                  {item.options.unit}
                </span>
              )}
            </div>

            {item.options.quickAmounts &&
              item.options.quickAmounts.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginBottom: 14,
                  }}
                >
                  {item.options.quickAmounts.map(amt => {
                    const formatted = amt.toLocaleString('en-US')
                    const isSelected = value === formatted
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setValue(formatted)}
                        style={{
                          padding: '5px 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 99,
                          border: isSelected
                            ? '1px solid var(--acc)'
                            : '1px solid var(--bd)',
                          background: isSelected
                            ? 'rgba(45, 184, 76, 0.16)'
                            : 'var(--bg2)',
                          color: isSelected ? 'var(--acc)' : 'var(--mut)',
                          cursor: 'pointer',
                        }}
                      >
                        {amt >= 1_000_000
                          ? `${amt / 1_000_000}tr`
                          : `${amt / 1_000}k`}
                      </button>
                    )
                  })}
                </div>
              )}

            {item.options.allowClearZero && (
              <button
                type="button"
                onClick={handleClearZero}
                style={{
                  width: '100%',
                  marginBottom: 10,
                  padding: '9px 12px',
                  borderRadius: 12,
                  border: '1px dashed rgba(255, 90, 95, 0.45)',
                  background: 'rgba(255, 90, 95, 0.08)',
                  color: 'var(--exp)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {item.options.clearText ?? '🗑️ Xoá hạn mức ngân sách này'}
              </button>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn ghost"
                onClick={handleCancel}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '11px 14px',
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                {item.options.cancelText ?? 'Huỷ'}
              </button>
              <button
                type="submit"
                className="btn primary"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '11px 14px',
                  borderRadius: 12,
                  fontWeight: 700,
                }}
              >
                {item.options.confirmText ?? 'Lưu'}
              </button>
            </div>
          </form>
        )}

        {item.kind !== 'prompt' && (
          <div style={{ display: 'flex', gap: 10 }}>
            {item.kind === 'confirm' && (
              <button
                type="button"
                className="btn ghost"
                onClick={handleCancel}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '11px 14px',
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                {item.options.cancelText ?? 'Huỷ'}
              </button>
            )}
            <button
              type="button"
              className={`btn ${
                tone === 'danger' ? 'danger' : 'primary'
              }`}
              onClick={handleConfirm}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '11px 14px',
                borderRadius: 12,
                fontWeight: 700,
              }}
            >
              {item.options.confirmText ??
                (item.kind === 'confirm'
                  ? tone === 'danger'
                    ? 'Xoá'
                    : 'Xác nhận'
                  : 'Đã hiểu')}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
