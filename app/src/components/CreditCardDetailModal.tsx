import { useMemo, useState } from 'react'
import {
  db,
  type Category,
  type Fund,
  type InstallmentInfo,
  type InstallmentTermMonths,
  type Tx,
} from '../db'
import {
  analyzeCreditFund,
  computeDefaultFirstStatementDate,
  computeInstallmentStatus,
  effectOn,
  fmtDmy,
  getCategoryFullName,
  money,
  ymd,
} from '../lib'
import DateInput from './DateInput'
import TxDetailModal from './TxDetailModal'
import TxForm, { type TxFormDraft } from './TxForm'
import { showAlert, showConfirm } from './AppDialog'

const TERM_OPTIONS: InstallmentTermMonths[] = [3, 6, 12, 24]

export function InstallmentConvertModal({
  tx,
  fund,
  catName,
  catIcon,
  today: todayProp,
  onClose,
}: {
  tx: Tx
  fund?: Fund
  catName: string
  catIcon: string
  today?: Date
  onClose: () => void
}) {
  const [fallbackToday] = useState(() => new Date())
  const today = todayProp ?? fallbackToday
  const existing = tx.installment
  const statementDay = fund?.statementDay ?? 20
  const creditAnalysis = useMemo(
    () => (fund ? analyzeCreditFund(fund, [], today) : null),
    [fund, today],
  )

  const [termMonths, setTermMonths] = useState<InstallmentTermMonths>(existing?.termMonths ?? 3)
  const [startDate, setStartDate] = useState<string>(existing?.startDate ?? tx.date ?? ymd(today))
  const [firstStatementDate, setFirstStatementDate] = useState<string>(
    existing?.firstStatementDate ?? computeDefaultFirstStatementDate(tx.date, statementDay),
  )
  const [feePctStr, setFeePctStr] = useState<string>(
    existing?.conversionFeePct ? String(existing.conversionFeePct) : '0',
  )
  const [paidCyclesMode, setPaidCyclesMode] = useState<'auto' | 'manual'>(
    existing?.paidCyclesManual != null ? 'manual' : 'auto',
  )
  const [manualPaidCycles, setManualPaidCycles] = useState<number>(existing?.paidCyclesManual ?? 0)
  const [saving, setSaving] = useState(false)

  const feePct = Math.max(0, Number(feePctStr.replace(/,/g, '.')) || 0)
  const totalAmountWithFee = Math.round(tx.amount * (1 + feePct / 100))
  const monthlyAmount = Math.round(totalAmountWithFee / termMonths)

  const previewTx: Tx = useMemo(
    () => ({
      ...tx,
      installment: {
        termMonths,
        startDate,
        firstStatementDate,
        conversionFeePct: feePct,
        monthlyAmount,
        totalAmountWithFee,
        paidCyclesManual:
          paidCyclesMode === 'manual' ? Math.min(termMonths, Math.max(0, manualPaidCycles)) : null,
      },
    }),
    [
      tx,
      termMonths,
      startDate,
      firstStatementDate,
      feePct,
      monthlyAmount,
      totalAmountWithFee,
      paidCyclesMode,
      manualPaidCycles,
    ],
  )

  const previewStatus = useMemo(
    () => computeInstallmentStatus(previewTx, fund, today),
    [previewTx, fund, today],
  )

  async function handleSave() {
    if (!tx.id) return
    setSaving(true)
    try {
      const info: InstallmentInfo = {
        termMonths,
        startDate,
        firstStatementDate,
        conversionFeePct: feePct,
        monthlyAmount,
        totalAmountWithFee,
        paidCyclesManual:
          paidCyclesMode === 'manual' ? Math.min(termMonths, Math.max(0, manualPaidCycles)) : null,
      }
      await db.txs.put({
        ...tx,
        installment: info,
      })
      await showAlert({
        title: 'Đã chuyển đổi trả góp',
        message: `Khoản chi "${tx.note || catName}" (${money(tx.amount)}) đã chuyển sang trả góp ${termMonths} tháng (${money(monthlyAmount)}/kỳ), bắt đầu từ kỳ chốt ${fmtDmy(firstStatementDate)}.`,
        icon: '📅',
        tone: 'success',
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveInstallment() {
    if (!tx.id || !tx.installment) return
    const ok = await showConfirm({
      title: 'Huỷ chế độ trả góp?',
      message: 'Giao dịch này sẽ quay về giao dịch chi tiêu thẻ tín dụng thông thường.',
      icon: '🔄',
      danger: true,
      confirmText: 'Huỷ trả góp',
    })
    if (!ok) return
    await db.txs.put({
      ...tx,
      installment: null,
    })
    onClose()
  }

  return (
    <div className="sheetbg" onClick={onClose} style={{ zIndex: 92 }}>
      <div
        className="sheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 500,
          margin: '0 auto',
          maxHeight: '90dvh',
          overflowY: 'auto',
          padding: '16px 16px calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            className="close-pill-btn"
            style={{ whiteSpace: 'nowrap' }}
            onClick={onClose}
          >
            Huỷ
          </button>
          <b style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
            {existing ? 'Cập nhật trả góp' : 'Chuyển đổi trả góp'}
          </b>
          <button
            type="button"
            className="close-pill-btn"
            style={{ color: 'var(--acc)', fontWeight: 700, whiteSpace: 'nowrap' }}
            disabled={saving}
            onClick={handleSave}
          >
            Lưu
          </button>
        </div>

        {/* Thông tin giao dịch gốc */}
        <div
          className="card"
          style={{
            padding: '12px 14px',
            marginBottom: 14,
            background: 'color-mix(in srgb, var(--fg) 5%, transparent)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 22 }}>{catIcon}</span>
              <div style={{ minWidth: 0 }}>
                <b
                  style={{
                    fontSize: 15,
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tx.note || catName}
                </b>
                <small className="mut">
                  {fmtDmy(tx.date)} · {fund?.name ?? 'Thẻ tín dụng'}
                </small>
              </div>
            </div>
            <b className="exp" style={{ fontSize: 16, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {money(tx.amount)}
            </b>
          </div>
        </div>

        {/* 1. Chọn kỳ hạn trả góp 3 / 6 / 12 / 24 tháng */}
        <div className="fld">
          <span>Chọn kỳ hạn trả góp</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {TERM_OPTIONS.map(m => {
              const active = termMonths === m
              const perMonth = Math.round(totalAmountWithFee / m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setTermMonths(m)
                    if (manualPaidCycles > m) setManualPaidCycles(m)
                  }}
                  style={{
                    padding: '10px 4px',
                    borderRadius: 12,
                    border: active ? '1.5px solid var(--acc)' : '1px solid var(--bd)',
                    background: active
                      ? 'color-mix(in srgb, var(--acc) 16%, transparent)'
                      : 'var(--card)',
                    color: active ? 'var(--acc)' : 'var(--fg)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>{m} tháng</div>
                  <div className="mut" style={{ fontSize: 10.5, marginTop: 2, whiteSpace: 'nowrap' }}>
                    {money(perMonth)}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Ngày bắt đầu chuyển đổi */}
        <div className="fld">
          <span>Ngày bắt đầu chuyển đổi</span>
          <DateInput
            value={startDate}
            onChange={v => {
              setStartDate(v)
              setFirstStatementDate(computeDefaultFirstStatementDate(v, statementDay))
            }}
          />
        </div>

        {/* 3. Kỳ sao kê bắt đầu thanh toán */}
        <div className="fld">
          <span>Bắt đầu thanh toán ở kỳ sao kê</span>
          <DateInput value={firstStatementDate} onChange={setFirstStatementDate} />
          {creditAnalysis && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                type="button"
                className="pill-tag"
                style={{
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  border:
                    firstStatementDate === creditAnalysis.nextStatementDate
                      ? '1px solid var(--acc)'
                      : '1px solid var(--bd)',
                }}
                onClick={() => setFirstStatementDate(creditAnalysis.nextStatementDate)}
              >
                Kỳ đang mở ({fmtDmy(creditAnalysis.nextStatementDate)})
              </button>
              <button
                type="button"
                className="pill-tag"
                style={{
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  border:
                    firstStatementDate === creditAnalysis.lastStatementDate
                      ? '1px solid var(--acc)'
                      : '1px solid var(--bd)',
                }}
                onClick={() => setFirstStatementDate(creditAnalysis.lastStatementDate)}
              >
                Kỳ vừa chốt ({fmtDmy(creditAnalysis.lastStatementDate)})
              </button>
            </div>
          )}
        </div>

        {/* 4. Phí chuyển đổi trả góp (%) */}
        <div className="fld">
          <span>Phí chuyển đổi (% · để 0 nếu miễn phí)</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              inputMode="decimal"
              value={feePctStr}
              onChange={e => setFeePctStr(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="0"
              style={{ maxWidth: 90 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1.5, 2, 3].map(p => (
                <button
                  key={p}
                  type="button"
                  className="pill-tag"
                  style={{ cursor: 'pointer', border: '1px solid var(--bd)', whiteSpace: 'nowrap' }}
                  onClick={() => setFeePctStr(String(p))}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Số kỳ đã thanh toán */}
        <div className="fld">
          <span>Số kỳ đã thanh toán</span>
          <div className="seg" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className={paidCyclesMode === 'auto' ? 'on' : ''}
              onClick={() => setPaidCyclesMode('auto')}
            >
              Tự động ({previewStatus?.autoPaidCycles ?? 0}/{termMonths} kỳ)
            </button>
            <button
              type="button"
              className={paidCyclesMode === 'manual' ? 'on' : ''}
              onClick={() => {
                setPaidCyclesMode('manual')
                setManualPaidCycles(previewStatus?.paidCycles ?? 0)
              }}
            >
              Tuỳ chỉnh
            </button>
          </div>
          {paidCyclesMode === 'manual' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setManualPaidCycles(c => Math.max(0, c - 1))}
              >
                － 1 kỳ
              </button>
              <b style={{ fontSize: 14.5, whiteSpace: 'nowrap' }}>
                Đã trả {manualPaidCycles} / {termMonths} kỳ
              </b>
              <button
                type="button"
                className="btn"
                onClick={() => setManualPaidCycles(c => Math.min(termMonths, c + 1))}
              >
                ＋ 1 kỳ
              </button>
            </div>
          )}
        </div>

        {/* 6. Bảng tóm tắt kế hoạch trả góp */}
        {previewStatus && (
          <div
            className="card"
            style={{
              padding: '12px 14px',
              marginTop: 8,
              border: '1px solid color-mix(in srgb, var(--acc) 35%, var(--bd))',
              background: 'color-mix(in srgb, var(--acc) 7%, var(--card))',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
              <div>
                <span className="mut">Đóng mỗi kỳ:</span>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg)', whiteSpace: 'nowrap' }}>
                  {money(previewStatus.monthlyAmount)}/kỳ
                </div>
              </div>
              <div>
                <span className="mut">Tổng sau phí ({feePct}%):</span>
                <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
                  {money(previewStatus.totalAmountWithFee)}
                </div>
              </div>
              <div>
                <span className="mut">Kỳ thanh toán đầu:</span>
                <div style={{ whiteSpace: 'nowrap' }}>
                  <b>{fmtDmy(previewStatus.firstDueDate)}</b>
                </div>
              </div>
              <div>
                <span className="mut">Tất toán dự kiến:</span>
                <div style={{ whiteSpace: 'nowrap' }}>
                  <b>{fmtDmy(previewStatus.finalDueDate)}</b>
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px dashed var(--bd)',
                fontSize: 12.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>
                Đã trả: <b>{previewStatus.paidCycles}/{termMonths} kỳ</b>
              </span>
              <span style={{ color: 'var(--acc)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                Còn {previewStatus.remainingCycles} kỳ ({money(previewStatus.remainingBalance)})
              </span>
            </div>
          </div>
        )}

        {existing && (
          <button
            type="button"
            className="btn dng"
            style={{ width: '100%', marginTop: 12 }}
            onClick={handleRemoveInstallment}
          >
            Huỷ trả góp (Về giao dịch thường)
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Hộp thoại chọn giao dịch chi tiêu trong tháng để chuyển đổi sang trả góp
 */
function SelectTxForInstallmentModal({
  txs,
  cats,
  fund,
  defaultMonthKey,
  onSelect,
  onClose,
}: {
  txs: Tx[]
  cats: Category[]
  fund: Fund
  defaultMonthKey: string
  onSelect: (tx: Tx) => void
  onClose: () => void
}) {
  const cMap = useMemo(() => new Map(cats.map(c => [c.id!, c])), [cats])

  // Tất cả giao dịch chi tiêu của thẻ này
  const expenseTxs = useMemo(
    () =>
      txs
        .filter(t => t.fundId === fund.id && t.type === 'expense')
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [txs, fund.id],
  )

  // Danh sách các tháng (YYYY-MM) có giao dịch chi tiêu
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    if (defaultMonthKey) set.add(defaultMonthKey)
    for (const t of expenseTxs) {
      set.add(t.date.slice(0, 7))
    }
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [expenseTxs, defaultMonthKey])

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] ?? defaultMonthKey,
  )

  const monthTxs = useMemo(
    () =>
      selectedMonth === 'all'
        ? expenseTxs
        : expenseTxs.filter(t => t.date.startsWith(selectedMonth)),
    [expenseTxs, selectedMonth],
  )

  const fmtMonth = (ym: string) => {
    if (ym === 'all') return 'Tất cả các tháng'
    const [y, m] = ym.split('-')
    return `Tháng ${m}/${y}`
  }

  return (
    <div className="sheetbg" onClick={onClose} style={{ zIndex: 88 }}>
      <div
        className="sheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 500,
          margin: '0 auto',
          maxHeight: '86dvh',
          overflowY: 'auto',
          padding: '16px 16px calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            className="close-pill-btn"
            style={{ whiteSpace: 'nowrap' }}
            onClick={onClose}
          >
            ‹ Đóng
          </button>
          <b style={{ fontSize: 15.5, whiteSpace: 'nowrap' }}>Chọn giao dịch chuyển trả góp</b>
          <span style={{ width: 52 }} />
        </div>

        {/* Bộ lọc chọn tháng gọn trên 1 hàng */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span className="mut" style={{ fontSize: 13 }}>
            Chọn khoản chi trong tháng:
          </span>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 99,
              border: '1px solid var(--bd)',
              background: 'var(--card)',
              color: 'var(--fg)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {availableMonths.map(ym => (
              <option key={ym} value={ym}>
                {fmtMonth(ym)}
              </option>
            ))}
            <option value="all">Tất cả ({expenseTxs.length})</option>
          </select>
        </div>

        <div className="card" style={{ padding: '0 14px' }}>
          {monthTxs.length === 0 && (
            <div className="empty" style={{ padding: '22px 0' }}>
              Không có giao dịch chi tiêu nào trong thời gian này.
            </div>
          )}
          {monthTxs.map(t => {
            const c = t.categoryId ? cMap.get(t.categoryId) : undefined
            const catName = c ? getCategoryFullName(c, cats) : 'Chi tiêu thẻ'
            const catIcon = c?.icon ?? '💳'
            return (
              <div
                key={t.id}
                className="row"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(t)}
              >
                <div
                  className="ico"
                  style={{
                    background: (c?.color ?? fund.color) + '26',
                    width: 38,
                    height: 38,
                    fontSize: 18,
                  }}
                >
                  {catIcon}
                </div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <b
                      style={{
                        fontSize: 14.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                    >
                      {catName}
                    </b>
                    {t.installment && (
                      <span
                        className="pill-tag"
                        style={{
                          fontSize: 10.5,
                          color: 'var(--acc)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Đã trả góp {t.installment.termMonths}T
                      </span>
                    )}
                  </div>
                  <small className="mut" style={{ display: 'block', marginTop: 2 }}>
                    {fmtDmy(t.date)}
                    {t.note ? ` · ${t.note}` : ''}
                  </small>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <b className="exp" style={{ fontSize: 15 }}>
                    -{money(t.amount)}
                  </b>
                  <div style={{ fontSize: 11, color: 'var(--acc)', marginTop: 2 }}>
                    Chọn ›
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function CreditCardDetailModal({
  fund,
  txs,
  cats,
  today: todayProp,
  onClose,
  onEditFund,
  onPayCard,
}: {
  fund: Fund
  txs: Tx[]
  cats: Category[]
  today?: Date
  onClose: () => void
  onEditFund?: (f: Fund) => void
  onPayCard?: (f: Fund, amount: number, note: string) => void
  onSelectTx?: (tx: Tx) => void
}) {
  const [fallbackToday] = useState(() => new Date())
  const today = todayProp ?? fallbackToday
  const [activeTab, setActiveTab] = useState<'txs' | 'installments'>('txs')
  // Bộ lọc gọn: 'current_cycle' (mặc định) hoặc mã tháng 'YYYY-MM' hoặc 'all'
  const [filterMode, setFilterMode] = useState<string>('current_cycle')
  const [showPickTxModal, setShowPickTxModal] = useState(false)
  const [convertingTx, setConvertingTx] = useState<Tx | null>(null)
  const [viewingTx, setViewingTx] = useState<Tx | null>(null)
  const [editingTx, setEditingTx] = useState<Tx | null>(null)
  const [dupDraft, setDupDraft] = useState<TxFormDraft | null>(null)
  const [expandedScheduleTxId, setExpandedScheduleTxId] = useState<number | null>(null)

  const cMap = useMemo(() => new Map(cats.map(c => [c.id!, c])), [cats])
  const info = useMemo(() => analyzeCreditFund(fund, txs, today), [fund, txs, today])

  // Toàn bộ giao dịch liên quan tới thẻ tín dụng này
  const cardTxs = useMemo(
    () =>
      txs
        .filter(t => t.fundId === fund.id || t.toFundId === fund.id)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [txs, fund.id],
  )

  // Danh sách các tháng (YYYY-MM) có giao dịch để xem lại khi cần
  const availableMonths = useMemo(() => {
    const s = new Set<string>()
    s.add(ymd(today).slice(0, 7))
    for (const t of cardTxs) {
      s.add(t.date.slice(0, 7))
    }
    return [...s].sort((a, b) => b.localeCompare(a))
  }, [cardTxs, today])

  // Lọc giao dịch theo Kỳ hiện tại hoặc theo Tháng được chọn
  const filteredTxs = useMemo(() => {
    if (filterMode === 'current_cycle') {
      return cardTxs.filter(
        t => t.date > info.lastStatementDate && t.date <= info.nextStatementDate,
      )
    }
    if (filterMode === 'prev_cycle') {
      return cardTxs.filter(
        t => t.date > info.prevStatementDate && t.date <= info.lastStatementDate,
      )
    }
    if (filterMode === 'all') {
      return cardTxs
    }
    return cardTxs.filter(t => t.date.startsWith(filterMode))
  }, [cardTxs, filterMode, info.prevStatementDate, info.lastStatementDate, info.nextStatementDate])

  const filteredSummary = useMemo(() => {
    let expense = 0
    let paid = 0
    for (const t of filteredTxs) {
      const eff = effectOn(t, fund.id!)
      if (eff < 0) expense += -eff
      else if (eff > 0) paid += eff
    }
    return { expense, paid }
  }, [filteredTxs, fund.id])

  // Danh sách các giao dịch trả góp của thẻ
  const installmentItems = useMemo(() => {
    return cardTxs
      .filter(t => t.fundId === fund.id && t.type === 'expense' && t.installment)
      .map(t => ({
        tx: t,
        status: computeInstallmentStatus(t, fund, today)!,
      }))
      .filter(item => item.status !== null)
  }, [cardTxs, fund, today])

  async function handleStepPaidCycles(tx: Tx, currentPaid: number, delta: number) {
    if (!tx.id || !tx.installment) return
    const nextPaid = Math.min(
      tx.installment.termMonths,
      Math.max(0, currentPaid + delta),
    )
    await db.txs.put({
      ...tx,
      installment: {
        ...tx.installment,
        paidCyclesManual: nextPaid,
      },
    })
  }

  const fmtMonthOption = (ym: string) => {
    const [y, m] = ym.split('-')
    return `Tháng ${m}/${y}`
  }

  return (
    <div className="sheetbg" onClick={onClose} style={{ zIndex: 75 }}>
      <div
        className="sheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 560,
          margin: '0 auto',
          maxHeight: '92dvh',
          overflowY: 'auto',
          padding: '16px 16px calc(28px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Topbar cân đối trên 1 hàng duy nhất */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            className="close-pill-btn"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={onClose}
          >
            ‹ Đóng
          </button>
          <b
            style={{
              fontSize: 16,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'center',
            }}
          >
            {fund.icon} {fund.name}
          </b>
          {onEditFund ? (
            <button
              type="button"
              className="close-pill-btn"
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => onEditFund(fund)}
            >
              ⚙️ Cài đặt
            </button>
          ) : (
            <span style={{ width: 64, flexShrink: 0 }} />
          )}
        </div>

        {/* Thẻ Tổng quan hạn mức & Tách bạch 2 kỳ sao kê cân bằng */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="pill-tag" style={{ whiteSpace: 'nowrap' }}>
                  Miễn lãi {info.interestFreeDaysToday} ngày
                </span>
                {fund.excludeFromTotal && (
                  <span className="pill-tag" style={{ whiteSpace: 'nowrap' }}>
                    Không tính vào tổng
                  </span>
                )}
              </div>
              <div className="mut" style={{ fontSize: 12.5, marginTop: 6, whiteSpace: 'nowrap' }}>
                Sao kê: <b>ngày {info.statementDay}</b> · Hạn TT: <b>ngày {info.dueDay}</b>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <small className="mut" style={{ display: 'block', whiteSpace: 'nowrap' }}>
                Dư nợ hiện tại
              </small>
              <div
                className={info.debt > 0 ? 'exp' : 'inc'}
                style={{ fontSize: 20, fontWeight: 800, whiteSpace: 'nowrap', marginTop: 2 }}
              >
                {info.debt > 0 ? `-${money(info.debt)}` : '0 ₫'}
              </div>
            </div>
          </div>

          {info.creditLimit > 0 && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  fontSize: 12,
                  marginBottom: 4,
                  gap: 6,
                }}
              >
                <span className="mut">
                  Khả dụng: {money(info.availableCredit)}
                </span>
                <span className="mut">
                  Hạn mức: {money(info.creditLimit)} ({info.utilizationPct}%)
                </span>
              </div>
              <div className="bar">
                <i
                  style={{
                    width: `${info.debt > 0 ? Math.max(4, info.utilizationPct) : 0}%`,
                    background: info.utilizationPct > 80 ? 'var(--exp)' : fund.color,
                  }}
                />
              </div>
            </div>
          )}

          {/* 2 Ô Kỳ sao kê cân xứng tuyệt đối (mỗi dòng 1 hàng, không xô lệch) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginTop: 12,
            }}
          >
            <div
              style={{
                padding: '10px 11px',
                borderRadius: 12,
                border:
                  info.previousStatementDebt > 0
                    ? '1px solid rgba(242,85,81,0.4)'
                    : '1px solid var(--bd)',
                background:
                  info.previousStatementDebt > 0
                    ? 'rgba(242,85,81,0.1)'
                    : 'color-mix(in srgb, var(--fg) 4%, transparent)',
                minWidth: 0,
              }}
            >
              <div className="mut" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                Kỳ chốt {fmtDmy(info.lastStatementDate)}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  marginTop: 4,
                  whiteSpace: 'nowrap',
                  color: info.previousStatementDebt > 0 ? 'var(--exp)' : 'var(--inc)',
                }}
              >
                {info.previousStatementDebt > 0
                  ? money(info.previousStatementDebt)
                  : '0 ₫ · Đã tất toán'}
              </div>
              <div className="mut" style={{ fontSize: 11.5, marginTop: 4, whiteSpace: 'nowrap' }}>
                Hạn TT: <b>{fmtDmy(info.nextDueDate)}</b>
              </div>
            </div>

            <div
              style={{
                padding: '10px 11px',
                borderRadius: 12,
                border: '1px solid var(--bd)',
                background: 'color-mix(in srgb, var(--fg) 4%, transparent)',
                minWidth: 0,
              }}
            >
              <div className="mut" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                Kỳ mới {fmtDmy(info.lastStatementDate).slice(0, 5)} →{' '}
                {fmtDmy(info.nextStatementDate).slice(0, 5)}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4, whiteSpace: 'nowrap' }}>
                {money(info.currentCycleSpend)}
              </div>
              <div className="mut" style={{ fontSize: 11.5, marginTop: 4, whiteSpace: 'nowrap' }}>
                Hạn TT: <b>{fmtDmy(info.nextCycleDueDate)}</b>
              </div>
            </div>
          </div>

          {/* Chỉ hiện cảnh báo khi thực sự có nợ kỳ cũ sắp đến hạn */}
          {info.statusTag === 'due-soon' && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 10px',
                borderRadius: 10,
                fontSize: 12,
                background: 'rgba(239,68,68,0.12)',
                color: 'var(--exp)',
              }}
            >
              {info.advice}
            </div>
          )}

          {/* Nút Tất toán căn giữa cân đối */}
          {onPayCard && info.debt > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 12,
              }}
            >
              <button
                type="button"
                className="btn pri"
                style={{
                  padding: '8px 24px',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  minWidth: 200,
                }}
                onClick={() =>
                  onPayCard(
                    fund,
                    info.previousStatementDebt > 0 ? info.previousStatementDebt : info.debt,
                    `Tất toán dư nợ thẻ ${fund.name}`,
                  )
                }
              >
                Tất toán (
                {money(info.previousStatementDebt > 0 ? info.previousStatementDebt : info.debt)})
              </button>
            </div>
          )}
        </div>

        {/* 2 Tab chuyển đổi cân bằng 1 dòng */}
        <div className="seg" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={activeTab === 'txs' ? 'on' : ''}
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('txs')}
          >
            📋 Giao dịch thẻ ({cardTxs.length})
          </button>
          <button
            type="button"
            className={activeTab === 'installments' ? 'on' : ''}
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('installments')}
          >
            📅 Trả góp ({installmentItems.length})
          </button>
        </div>

        {activeTab === 'txs' ? (
          <>
            {/* Bộ lọc gộp gọn trên 1 hàng: Kỳ hiện tại + Xem lại các tháng */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
              }}
            >
              <button
                type="button"
                className="pill-tag"
                style={{
                  cursor: 'pointer',
                  padding: '6px 10px',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  border:
                    filterMode === 'current_cycle'
                      ? '1.5px solid var(--acc)'
                      : '1px solid var(--bd)',
                  color: filterMode === 'current_cycle' ? 'var(--acc)' : 'var(--fg)',
                  fontWeight: filterMode === 'current_cycle' ? 700 : 500,
                }}
                onClick={() => setFilterMode('current_cycle')}
              >
                Kỳ hiện tại ({fmtDmy(info.lastStatementDate).slice(0, 5)} →{' '}
                {fmtDmy(info.nextStatementDate).slice(0, 5)})
              </button>

              <select
                value={filterMode === 'current_cycle' ? '' : filterMode}
                onChange={e => {
                  const val = e.target.value
                  setFilterMode(val || 'current_cycle')
                }}
                aria-label="Xem lại kỳ hoặc tháng khác"
                style={{
                  padding: '6px 8px',
                  borderRadius: 99,
                  border:
                    filterMode !== 'current_cycle'
                      ? '1.5px solid var(--acc)'
                      : '1px solid var(--bd)',
                  background: 'var(--card)',
                  color: filterMode !== 'current_cycle' ? 'var(--acc)' : 'var(--mut)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  flex: 1,
                  minWidth: 0,
                  maxWidth: 165,
                }}
              >
                <option value="">📅 Xem lại các tháng...</option>
                <option value="prev_cycle">
                  Kỳ trước ({fmtDmy(info.prevStatementDate).slice(0, 5)} →{' '}
                  {fmtDmy(info.lastStatementDate).slice(0, 5)})
                </option>
                {availableMonths.map(ym => (
                  <option key={ym} value={ym}>
                    {fmtMonthOption(ym)}
                  </option>
                ))}
                <option value="all">Tất cả giao dịch ({cardTxs.length})</option>
              </select>
            </div>

            {/* Tóm tắt nhanh của kỳ đang chọn */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12.5,
                padding: '4px 4px 10px',
                gap: 8,
              }}
              className="mut"
            >
              <span style={{ whiteSpace: 'nowrap' }}>
                Chi tiêu: <b className="exp">{money(filteredSummary.expense)}</b>
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>
                Đã trả / Hoàn: <b className="inc">+{money(filteredSummary.paid)}</b>
              </span>
            </div>

            {/* Danh sách giao dịch thẳng hàng, không gắn nút lẻ gây lệch bố cục */}
            <div className="card" style={{ padding: '0 14px' }}>
              {filteredTxs.length === 0 && (
                <div className="empty" style={{ padding: '22px 0' }}>
                  Chưa có giao dịch nào trong khoảng thời gian này.
                </div>
              )}
              {filteredTxs.map(t => {
                const eff = effectOn(t, fund.id!)
                const c = t.categoryId ? cMap.get(t.categoryId) : undefined
                const catName =
                  t.type === 'transfer'
                    ? 'Thanh toán / Chuyển quỹ'
                    : c
                      ? getCategoryFullName(c, cats)
                      : 'Chưa phân nhóm'
                const catIcon = t.type === 'transfer' ? '🔁' : (c?.icon ?? '💳')
                const instStatus =
                  t.type === 'expense' && t.installment
                    ? computeInstallmentStatus(t, fund, today)
                    : null

                return (
                  <div
                    key={t.id}
                    className="row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setViewingTx(t)}
                  >
                    <div
                      className="ico"
                      style={{
                        background: (c?.color ?? fund.color) + '26',
                        width: 38,
                        height: 38,
                        fontSize: 18,
                      }}
                    >
                      {catIcon}
                    </div>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <b
                          style={{
                            fontSize: 14.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                          }}
                        >
                          {catName}
                        </b>
                        {instStatus && (
                          <span
                            className="pill-tag"
                            style={{
                              fontSize: 10.5,
                              color: 'var(--acc)',
                              borderColor: 'var(--acc)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            Trả góp {instStatus.paidCycles}/{instStatus.termMonths} kỳ
                          </span>
                        )}
                      </div>
                      <small
                        className="mut"
                        style={{
                          display: 'block',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {fmtDmy(t.date)}
                        {t.note ? ` · ${t.note}` : ''}
                      </small>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      <b className={eff < 0 ? 'exp' : 'inc'} style={{ fontSize: 15 }}>
                        {eff < 0 ? `-${money(-eff)}` : `+${money(eff)}`}
                      </b>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          /* Tab 2: Quản lý các khoản trả góp 3 / 6 / 12 / 24 tháng */
          <>
            <div
              className="card"
              style={{
                marginBottom: 12,
                padding: '12px 10px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6,
                textAlign: 'center',
              }}
            >
              <div>
                <small className="mut" style={{ whiteSpace: 'nowrap' }}>
                  Đang trả góp
                </small>
                <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2, whiteSpace: 'nowrap' }}>
                  {info.activeInstallmentsCount} khoản
                </div>
              </div>
              <div>
                <small className="mut" style={{ whiteSpace: 'nowrap' }}>
                  Mỗi kỳ sao kê
                </small>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 14.5,
                    marginTop: 2,
                    color: 'var(--exp)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {money(info.monthlyInstallmentTotal)}
                </div>
              </div>
              <div>
                <small className="mut" style={{ whiteSpace: 'nowrap' }}>
                  Còn lại
                </small>
                <div style={{ fontWeight: 800, fontSize: 14.5, marginTop: 2, whiteSpace: 'nowrap' }}>
                  {money(info.remainingInstallmentBalance)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="btn pri"
                style={{ width: '100%', padding: '10px 14px', fontSize: 13.5 }}
                onClick={() => setShowPickTxModal(true)}
              >
                + Chọn giao dịch trong tháng để chuyển trả góp
              </button>
            </div>

            {installmentItems.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '22px 16px' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>📅</div>
                <b>Chưa có khoản trả góp nào</b>
                <p className="mut" style={{ fontSize: 13, marginTop: 4 }}>
                  Bấm nút phía trên để chọn giao dịch chi tiêu thẻ và chia kỳ hạn 3, 6, 12 hoặc 24
                  tháng.
                </p>
              </div>
            ) : (
              installmentItems.map(({ tx, status: st }) => {
                const c = tx.categoryId ? cMap.get(tx.categoryId) : undefined
                const catName = c ? getCategoryFullName(c, cats) : 'Chi tiêu thẻ'
                const catIcon = c?.icon ?? '💳'
                const progressPct = Math.round((st.paidCycles / st.termMonths) * 100)
                const isExpanded = expandedScheduleTxId === tx.id

                return (
                  <div className="card" key={tx.id} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                      }}
                      onClick={() => setViewingTx(tx)}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                        <div
                          className="ico"
                          style={{
                            background: (c?.color ?? fund.color) + '26',
                            width: 38,
                            height: 38,
                            fontSize: 18,
                          }}
                        >
                          {catIcon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <b
                              style={{
                                fontSize: 15,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%',
                              }}
                            >
                              {tx.note || catName}
                            </b>
                            <span
                              className="pill-tag"
                              style={{
                                color: st.isCompleted ? 'var(--inc)' : 'var(--acc)',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {st.termMonths} tháng
                            </span>
                          </div>
                          <small className="mut" style={{ display: 'block', marginTop: 2 }}>
                            Gốc: {money(tx.amount)} · Ngày {fmtDmy(tx.date)}
                          </small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        <div className="exp" style={{ fontWeight: 800, fontSize: 15 }}>
                          {money(st.monthlyAmount)}/kỳ
                        </div>
                        <small className="mut">Chi tiết ›</small>
                      </div>
                    </div>

                    {/* 2x2 Ô thông tin gọn gàng, không rớt dòng */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        marginTop: 10,
                        padding: '9px 11px',
                        borderRadius: 12,
                        background: 'color-mix(in srgb, var(--fg) 4%, transparent)',
                        fontSize: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <span className="mut">Ngày chuyển đổi:</span>
                        <div style={{ fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap' }}>
                          {fmtDmy(st.startDate)}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="mut">Bắt đầu sao kê:</span>
                        <div style={{ fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap' }}>
                          {fmtDmy(st.firstStatementDate)}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="mut">Kỳ TT tiếp theo:</span>
                        <div
                          style={{
                            fontWeight: 600,
                            marginTop: 2,
                            color: 'var(--acc)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {st.nextPaymentDueDate
                            ? `Kỳ ${st.currentCycleNumber}/${st.termMonths} (${fmtDmy(st.nextPaymentDueDate).slice(0, 5)})`
                            : 'Đã hoàn tất'}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span className="mut">Thời gian còn lại:</span>
                        <div style={{ fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap' }}>
                          {st.remainingCycles > 0
                            ? `${st.remainingCycles} kỳ (hết ${fmtDmy(st.finalDueDate).slice(0, 5)})`
                            : '0 kỳ'}
                        </div>
                      </div>
                    </div>

                    {/* Thanh tiến độ trả dần */}
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 4,
                          fontSize: 12,
                          marginBottom: 4,
                        }}
                      >
                        <span>
                          Đã trả: <b>{st.paidCycles}/{st.termMonths} kỳ</b> ({money(st.paidAmount)})
                        </span>
                        <span>
                          Còn: <b className="exp">{money(st.remainingBalance)}</b>
                        </span>
                      </div>
                      <div className="bar">
                        <i
                          style={{
                            width: `${progressPct > 0 ? Math.max(4, progressPct) : 0}%`,
                            background: 'var(--acc)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Các nút thao tác gọn trên 1 hàng */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 10,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '5px 9px', fontSize: 12, whiteSpace: 'nowrap' }}
                          disabled={st.paidCycles <= 0}
                          onClick={() => handleStepPaidCycles(tx, st.paidCycles, -1)}
                        >
                          －1 kỳ
                        </button>
                        <button
                          type="button"
                          className="btn pri"
                          style={{ padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                          disabled={st.paidCycles >= st.termMonths}
                          onClick={() => handleStepPaidCycles(tx, st.paidCycles, 1)}
                        >
                          ＋1 kỳ đã trả
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '5px 9px', fontSize: 12, whiteSpace: 'nowrap' }}
                          onClick={() =>
                            setExpandedScheduleTxId(isExpanded ? null : (tx.id ?? null))
                          }
                        >
                          {isExpanded ? 'Ẩn lịch' : '📅 Lịch kỳ'}
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '5px 9px', fontSize: 12, whiteSpace: 'nowrap' }}
                          onClick={() => setConvertingTx(tx)}
                        >
                          ⚙️ Sửa
                        </button>
                      </div>
                    </div>

                    {/* Bảng lịch biểu chi tiết từng kỳ sao kê */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: '1px dashed var(--bd)',
                          fontSize: 12,
                        }}
                      >
                        {st.schedule.map(item => (
                          <div
                            key={item.cycleIndex}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '5px 6px',
                              borderRadius: 8,
                              background:
                                item.status === 'current'
                                  ? 'color-mix(in srgb, var(--acc) 12%, transparent)'
                                  : 'transparent',
                            }}
                          >
                            <span style={{ whiteSpace: 'nowrap' }}>
                              <b>
                                Kỳ {item.cycleIndex}/{st.termMonths}
                              </b>{' '}
                              · TT {fmtDmy(item.dueDate)}
                            </span>
                            <span style={{ whiteSpace: 'nowrap' }}>
                              <b>{money(item.amount)}</b>{' '}
                              {item.status === 'paid'
                                ? '✅'
                                : item.status === 'current'
                                  ? '⏳'
                                  : '📅'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </>
        )}

        {/* Modal chọn giao dịch trong tháng để chuyển trả góp */}
        {showPickTxModal && (
          <SelectTxForInstallmentModal
            txs={txs}
            cats={cats}
            fund={fund}
            defaultMonthKey={
              filterMode !== 'current_cycle' &&
              filterMode !== 'prev_cycle' &&
              filterMode !== 'all'
                ? filterMode
                : ymd(today).slice(0, 7)
            }
            onClose={() => setShowPickTxModal(false)}
            onSelect={t => {
              setShowPickTxModal(false)
              setConvertingTx(t)
            }}
          />
        )}

        {/* Modal Chi tiết giao dịch hiển thị TRỰC TIẾP trên trang chi tiết thẻ (z-index 85) */}
        {viewingTx && (
          <TxDetailModal
            tx={viewingTx}
            onClose={() => setViewingTx(null)}
            onEdit={t => {
              setViewingTx(null)
              setEditingTx(t)
            }}
            onDuplicate={draft => {
              setViewingTx(null)
              setDupDraft(draft)
            }}
          />
        )}

        {editingTx && <TxForm tx={editingTx} onClose={() => setEditingTx(null)} />}
        {dupDraft && <TxForm draft={dupDraft} onClose={() => setDupDraft(null)} />}

        {/* Modal chuyển đổi / chỉnh sửa trả góp 3/6/12/24 tháng (z-index 92) */}
        {convertingTx && (
          <InstallmentConvertModal
            tx={convertingTx}
            fund={fund}
            catName={
              convertingTx.categoryId && cMap.get(convertingTx.categoryId)
                ? getCategoryFullName(cMap.get(convertingTx.categoryId)!, cats)
                : 'Chi tiêu thẻ'
            }
            catIcon={
              convertingTx.categoryId && cMap.get(convertingTx.categoryId)
                ? cMap.get(convertingTx.categoryId)!.icon
                : '💳'
            }
            today={today}
            onClose={() => setConvertingTx(null)}
          />
        )}
      </div>
    </div>
  )
}
