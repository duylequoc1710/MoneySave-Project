import { useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { Fund, Tx } from '../db'
import { effectOn, money } from '../lib'

export interface SelectOption<T extends string | number = string | number> {
  value: T
  label: string
  subLabel?: string
  rightText?: string
  rightClassName?: string
  icon?: string
  color?: string
  badge?: string
  group?: string
}

export function fundsToSelectOptions(
  funds: Fund[],
  txs?: Tx[],
  opts?: { showBalance?: boolean; emptyOption?: SelectOption<number> }
): SelectOption<number>[] {
  const showBal = opts?.showBalance ?? Boolean(txs)
  const list: SelectOption<number>[] = []
  if (opts?.emptyOption) {
    list.push(opts.emptyOption)
  }
  for (const f of funds) {
    if (f.id == null) continue
    const bal = txs ? f.initialBalance + txs.reduce((s, t) => s + effectOn(t, f.id!), 0) : f.initialBalance
    list.push({
      value: f.id,
      label: f.name,
      subLabel: showBal ? `Số dư: ${money(bal)}` : (f.kind === 'credit' ? 'Thẻ tín dụng' : 'Ví tiền / Tài khoản'),
      rightText: showBal ? money(bal) : undefined,
      rightClassName: bal < 0 ? 'exp' : 'inc',
      icon: f.icon || '👛',
      color: f.color || '#22c55e',
      badge: f.kind === 'credit' ? 'Tín dụng' : f.excludeFromTotal ? 'Riêng biệt' : undefined,
    })
  }
  return list
}

interface InAppSelectProps<T extends string | number> {
  value: T
  options: SelectOption<T>[]
  onChange: (val: T) => void
  title?: string
  placeholder?: string
  variant?: 'field' | 'tile' | 'pill'
  style?: CSSProperties
  className?: string
  disabled?: boolean
}

export function InAppSelect<T extends string | number>({
  value,
  options,
  onChange,
  title = 'Chọn tuỳ chọn',
  placeholder = 'Chọn...',
  variant = 'field',
  style,
  className = '',
  disabled = false,
}: InAppSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  const renderTrigger = () => {
    if (variant === 'pill') {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(true)}
          className={className}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            borderRadius: 10,
            border: '1px solid var(--bd)',
            background: 'color-mix(in srgb, var(--card) 92%, #000)',
            color: 'var(--fg)',
            fontSize: 13,
            fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            ...style,
          }}
        >
          {selected?.icon && <span style={{ fontSize: 15, flexShrink: 0 }}>{selected.icon}</span>}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected ? selected.label : placeholder}
            {selected?.rightText ? ` (${selected.rightText})` : ''}
          </span>
          <span style={{ color: 'var(--mut)', fontSize: 12, flexShrink: 0 }}>▾</span>
        </button>
      )
    }

    if (variant === 'tile') {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(true)}
          className={`ml-select-tile ${className}`.trim()}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
        >
          {selected?.icon && (
            <div
              className="ico round"
              style={{
                background: (selected.color || '#3b82f6') + '28',
                width: 42,
                height: 42,
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {selected.icon}
            </div>
          )}
          <div className="grow" style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <b style={{ fontSize: 15, color: selected ? 'var(--fg)' : 'var(--mut)' }}>
                {selected ? selected.label : placeholder}
              </b>
              {selected?.badge && <span className="pill-tag">{selected.badge}</span>}
            </div>
            {selected?.subLabel && (
              <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>{selected.subLabel}</small>
            )}
          </div>
          <span className="ml-select-chevron">›</span>
        </button>
      )
    }

    // Default 'field' variant: matches .fld button look with icon & chevron
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={className}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 13px',
          borderRadius: 12,
          border: '1px solid var(--bd)',
          background: 'color-mix(in srgb, var(--bg) 60%, var(--card))',
          color: selected ? 'var(--fg)' : 'var(--mut)',
          fontSize: 15,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s',
          ...style,
        }}
      >
        {selected?.icon && (
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: (selected.color || '#3b82f6') + '26',
              display: 'grid',
              placeItems: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {selected.icon}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selected ? selected.label : placeholder}
            </span>
            {selected?.badge && <span className="pill-tag" style={{ fontSize: 10 }}>{selected.badge}</span>}
          </div>
          {selected?.subLabel && (
            <div style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 500, marginTop: 1 }}>
              {selected.subLabel}
            </div>
          )}
        </div>
        <span style={{ color: 'var(--mut)', fontSize: 14, flexShrink: 0 }}>▾</span>
      </button>
    )
  }

  return (
    <>
      {renderTrigger()}
      {open &&
        createPortal(
          <div
            className="sheetbg"
            style={{ zIndex: 120 }}
            onClick={e => {
              e.stopPropagation()
              setOpen(false)
            }}
          >
            <div
              className="sheet"
              style={{ maxHeight: '82vh', paddingBottom: 24 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="ledger-topbar" style={{ marginBottom: 14 }}>
                <button type="button" className="close-pill-btn" onClick={() => setOpen(false)}>
                  Đóng
                </button>
                <b style={{ fontSize: 16 }}>{title}</b>
                <span style={{ width: 60 }} />
              </div>

              <div className="card" style={{ padding: '4px 14px', maxHeight: '65vh', overflowY: 'auto' }}>
                {options.map(opt => {
                  const isSel = opt.value === value
                  return (
                    <div
                      key={String(opt.value)}
                      className="row"
                      style={{ cursor: 'pointer', padding: '12px 0' }}
                      onClick={() => {
                        onChange(opt.value)
                        setOpen(false)
                      }}
                    >
                      {opt.icon && (
                        <div
                          className="ico round"
                          style={{
                            background: (opt.color || '#3b82f6') + '28',
                            width: 40,
                            height: 40,
                            fontSize: 19,
                            flexShrink: 0,
                          }}
                        >
                          {opt.icon}
                        </div>
                      )}
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <b style={{ fontSize: 15, color: isSel ? 'var(--acc)' : 'var(--fg)' }}>{opt.label}</b>
                          {opt.badge && <span className="pill-tag">{opt.badge}</span>}
                        </div>
                        {opt.subLabel && (
                          <small style={{ color: 'var(--mut)', display: 'block', marginTop: 2 }}>{opt.subLabel}</small>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {opt.rightText && (
                          <b className={opt.rightClassName || ''} style={{ fontSize: 13 }}>
                            {opt.rightText}
                          </b>
                        )}
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
                    </div>
                  )
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
