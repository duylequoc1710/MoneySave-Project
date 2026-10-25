import { useMemo, useState } from 'react'
import type { Fund, Tx } from '../db'
import { computeTotalBalance, effectOn, money } from '../lib'

interface Props {
  fundFilter: number
  onChange: (fundId: number) => void
  funds: Fund[]
  txs: Tx[]
}

export function WalletSelectorPill({ fundFilter, onChange, funds, txs }: Props) {
  const [open, setOpen] = useState(false)

  const selectedFund = useMemo(() => funds.find(f => f.id === fundFilter), [funds, fundFilter])
  const includedWallets = useMemo(() => funds.filter(f => !f.archived && !f.excludeFromTotal), [funds])
  const excludedWallets = useMemo(() => funds.filter(f => !f.archived && f.excludeFromTotal), [funds])
  const archivedWallets = useMemo(() => funds.filter(f => f.archived), [funds])

  const balanceOf = (f: Fund) => f.initialBalance + txs.reduce((s, t) => s + effectOn(t, f.id!), 0)
  const totalIncludedBalance = useMemo(() => computeTotalBalance(funds, txs, 0), [funds, txs])

  return (
    <>
      <button
        type="button"
        className="wallet-pill-btn"
        onClick={() => setOpen(true)}
        title="Chọn ví hoặc quỹ để xem"
      >
        <span className="wallet-pill-icon">{fundFilter === 0 ? '🌐' : (selectedFund?.icon ?? '👛')}</span>
        <span className="wallet-pill-label">{fundFilter === 0 ? 'Tổng cộng' : (selectedFund?.name ?? 'Chọn ví')}</span>
        <span className="wallet-pill-caret">▾</span>
      </button>

      {open && (
        <div className="sheetbg" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="ledger-topbar" style={{ marginBottom: 14 }}>
              <button type="button" className="close-pill-btn" onClick={() => setOpen(false)}>
                Đóng
              </button>
              <b style={{ fontSize: 17 }}>Chọn Ví hiển thị</b>
              <span style={{ width: 64 }} />
            </div>

            {/* 1. TỔNG CỘNG */}
            <div className="card" style={{ padding: '2px 14px', marginBottom: 14 }}>
              <div
                className="row"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  onChange(0)
                  setOpen(false)
                }}
              >
                <div className="ico round" style={{ background: '#3b82f628' }}>
                  🌐
                </div>
                <div className="grow">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <b style={{ fontSize: 16 }}>Tổng cộng</b>
                    <span className="pill-tag">{includedWallets.length} ví</span>
                  </div>
                  <small>Gộp các ví thuộc nhóm Tính vào tổng</small>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <b className={totalIncludedBalance < 0 ? 'exp' : ''}>{money(totalIncludedBalance)}</b>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: fundFilter === 0 ? 'var(--acc)' : 'transparent',
                      border: fundFilter === 0 ? 'none' : '1.5px solid var(--bd)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {fundFilter === 0 ? '✓' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. NHÓM TÍNH VÀO TỔNG */}
            <h2 style={{ margin: '10px 4px 6px' }}>TÍNH VÀO TỔNG</h2>
            <div className="card" style={{ padding: '2px 14px', marginBottom: 14 }}>
              {includedWallets.map(f => {
                const bal = balanceOf(f)
                const isSel = fundFilter === f.id
                return (
                  <div
                    key={f.id}
                    className="row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      onChange(f.id!)
                      setOpen(false)
                    }}
                  >
                    <div className="ico round" style={{ background: f.color + '28' }}>
                      {f.icon}
                    </div>
                    <div className="grow">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <b style={{ fontSize: 15 }}>{f.name}</b>
                        {f.kind === 'credit' && <span className="pill-tag">Tín dụng</span>}
                      </div>
                      <small className={bal < 0 ? 'exp' : 'mut'}>{money(bal)}</small>
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

            {/* 3. NHÓM KHÔNG TÍNH VÀO TỔNG */}
            {excludedWallets.length > 0 && (
              <>
                <h2 style={{ margin: '10px 4px 6px' }}>KHÔNG TÍNH VÀO TỔNG</h2>
                <div className="card" style={{ padding: '2px 14px', marginBottom: 14 }}>
                  {excludedWallets.map(f => {
                    const bal = balanceOf(f)
                    const isSel = fundFilter === f.id
                    return (
                      <div
                        key={f.id}
                        className="row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          onChange(f.id!)
                          setOpen(false)
                        }}
                      >
                        <div className="ico round" style={{ background: f.color + '28' }}>
                          {f.icon}
                        </div>
                        <div className="grow">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <b style={{ fontSize: 15 }}>{f.name}</b>
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 99,
                                background: 'color-mix(in srgb, var(--fg) 10%, transparent)',
                                color: 'var(--mut)',
                              }}
                            >
                              Riêng biệt
                            </span>
                          </div>
                          <small className={bal < 0 ? 'exp' : 'mut'}>{money(bal)}</small>
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
              </>
            )}

            {/* 4. NHÓM ĐÃ LƯU TRỮ */}
            {archivedWallets.length > 0 && (
              <>
                <h2 style={{ margin: '10px 4px 6px' }}>❄️ ĐÃ LƯU TRỮ</h2>
                <div className="card" style={{ padding: '2px 14px', opacity: 0.75 }}>
                  {archivedWallets.map(f => {
                    const bal = balanceOf(f)
                    const isSel = fundFilter === f.id
                    return (
                      <div
                        key={f.id}
                        className="row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          onChange(f.id!)
                          setOpen(false)
                        }}
                      >
                        <div className="ico round" style={{ background: f.color + '28' }}>
                          {f.icon}
                        </div>
                        <div className="grow">
                          <b>{f.name}</b>
                          <small>{money(bal)}</small>
                        </div>
                        {isSel && <span className="inc">✓</span>}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
