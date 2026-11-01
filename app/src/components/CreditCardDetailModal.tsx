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
        title: 'Đã chuyển đổi trả góp thành công',
        message: `Giao dịch "${tx.note || catName}" (${money(tx.amount)}) đã được chuyển sang trả góp ${termMonths} tháng (${money(monthlyAmount)}/kỳ), bắt đầu từ kỳ sao kê chốt ${fmtDmy(firstStatementDate)}.`,
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
    <div className="sheetbg" onClick={onClose} style={{ zIndex: 90 }}>
      <div
        className="sheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 520,
          margin: '0 auto',
          maxHeight: '90dvh',
          overflowY: 'auto',
          padding: '16px 16px calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="ledger-topbar" style={{ marginBottom: 14 }}>
          <button type="button" className="close-pill-btn" onClick={onClose}>
            Huỷ
          </button>
          <b style={{ fontSize: 16 }}>
            {existing ? 'Cập nhật trả góp thẻ' : 'Chuyển đổi trả góp'}
          </b>
          <button
            type="button"
            className="close-pill-btn"
            style={{ color: 'var(--acc)', fontWeight: 700 }}
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
                <b style={{ fontSize: 15, display: 'block' }}>{tx.note || catName}</b>
                <small className="mut">
                  Ngày giao dịch: {fmtDmy(tx.date)} · Thẻ: {fund?.name ?? 'Thẻ tín dụng'}
                </small>
              </div>
            </div>
            <b className="exp" style={{ fontSize: 16, flexShrink: 0 }}>
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
                    padding: '10px 6px',
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
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{m} tháng</div>
                  <div className="mut" style={{ fontSize: 11, marginTop: 2 }}>
                    ~{money(perMonth)}/kỳ
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Ngày bắt đầu chuyển đổi */}
        <div className="fld">
          <span>Ngày bắt đầu chuyển đổi trả góp</span>
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
          <span>Thanh toán bắt đầu từ kỳ chốt sao kê</span>
          <DateInput value={firstStatementDate} onChange={setFirstStatementDate} />
          {creditAnalysis && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <button
                type="button"
                className="pill-tag"
                style={{
                  cursor: 'pointer',
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
          <span>Phí chuyển đổi trả góp (% trên tổng gốc · để 0 nếu trả góp 0%)</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              inputMode="decimal"
              value={feePctStr}
              onChange={e => setFeePctStr(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="0"
              style={{ maxWidth: 110 }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[0, 1.5, 2, 3].map(p => (
                <button
                  key={p}
                  type="button"
                  className="pill-tag"
                  style={{ cursor: 'pointer', border: '1px solid var(--bd)' }}
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
          <span>Tiến độ các kỳ đã thanh toán</span>
          <div className="seg" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className={paidCyclesMode === 'auto' ? 'on' : ''}
              onClick={() => setPaidCyclesMode('auto')}
            >
              Tự động theo kỳ sao kê ({previewStatus?.autoPaidCycles ?? 0}/{termMonths} kỳ)
            </button>
            <button
              type="button"
              className={paidCyclesMode === 'manual' ? 'on' : ''}
              onClick={() => {
                setPaidCyclesMode('manual')
                setManualPaidCycles(previewStatus?.paidCycles ?? 0)
              }}
            >
              Tuỳ chỉnh số kỳ đã trả
            </button>
          </div>
          {paidCyclesMode === 'manual' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setManualPaidCycles(c => Math.max(0, c - 1))}
              >
                － 1 kỳ
              </button>
              <b style={{ fontSize: 15 }}>
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
            <b style={{ fontSize: 13.5, color: 'var(--acc)', display: 'block', marginBottom: 8 }}>
              📋 Tóm tắt lộ trình trả góp {termMonths} tháng
            </b>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5 }}>
              <div>
                <span className="mut">Trả mỗi kỳ sao kê:</span>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg)' }}>
                  {money(previewStatus.monthlyAmount)}/kỳ
                </div>
              </div>
              <div>
                <span className="mut">Tổng gốc + phí ({feePct}%):</span>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {money(previewStatus.totalAmountWithFee)}
                </div>
              </div>
              <div>
                <span className="mut">Kỳ sao kê đầu tiên:</span>
                <div>
                  <b>{fmtDmy(previewStatus.firstStatementDate)}</b> (Hạn TT:{' '}
                  {fmtDmy(previewStatus.firstDueDate)})
                </div>
              </div>
              <div>
                <span className="mut">Kỳ tất toán cuối cùng:</span>
                <div>
                  <b>{fmtDmy(previewStatus.finalStatementDate)}</b> (Hạn TT:{' '}
                  {fmtDmy(previewStatus.finalDueDate)})
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
              }}
            >
              <span>
                Đã trả: <b>{previewStatus.paidCycles}/{termMonths} kỳ</b> ({money(previewStatus.paidAmount)})
              </span>
              <span style={{ color: 'var(--acc)', fontWeight: 700 }}>
                Còn lại: {previewStatus.remainingCycles} kỳ ({money(previewStatus.remainingBalance)})
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
            Huỷ chế độ trả góp (Về giao dịch thường)
          </button>
        )}
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
  onSelectTx,
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
  const [cycleFilter, setCycleFilter] = useState<'current' | 'previous' | 'all'>('current')
  const [convertingTx, setConvertingTx] = useState<Tx | null>(null)
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

  // Lọc theo kỳ sao kê
  const filteredTxs = useMemo(() => {
    if (cycleFilter === 'current') {
      return cardTxs.filter(
        t => t.date > info.lastStatementDate && t.date <= info.nextStatementDate,
      )
    }
    if (cycleFilter === 'previous') {
      return cardTxs.filter(
        t => t.date > info.prevStatementDate && t.date <= info.lastStatementDate,
      )
    }
    return cardTxs
  }, [cardTxs, cycleFilter, info.prevStatementDate, info.lastStatementDate, info.nextStatementDate])

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

  return (
    <div className="sheetbg" onClick={onClose} style={{ zIndex: 75 }}>
      <div
        className="sheet"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 600,
          margin: '0 auto',
          maxHeight: '92dvh',
          overflowY: 'auto',
          padding: '16px 16px calc(28px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Topbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <button type="button" className="close-pill-btn" onClick={onClose}>
            ‹ Đóng
          </button>
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <b style={{ fontSize: 16 }}>
              {fund.icon} {fund.name}
            </b>
            <small className="mut" style={{ display: 'block', fontSize: 11.5 }}>
              Chi tiết chi tiêu tín dụng & Trả góp
            </small>
          </div>
          {onEditFund ? (
            <button
              type="button"
              className="close-pill-btn"
              onClick={() => onEditFund(fund)}
            >
              ⚙️ Cài đặt thẻ
            </button>
          ) : (
            <span style={{ width: 64 }} />
          )}
        </div>

        {/* Thẻ Tổng quan hạn mức & Tách bạch 2 kỳ sao kê */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="pill-tag">Miễn lãi {info.interestFreeDaysToday} ngày</span>
                {fund.excludeFromTotal && (
                  <span className="pill-tag">Không tính vào tổng</span>
                )}
              </div>
              <div className="mut" style={{ fontSize: 12.5, marginTop: 6 }}>
                Chốt sao kê: <b>ngày {info.statementDay}</b> (còn {info.daysUntilStatement} ngày) · Hạn TT:{' '}
                <b>ngày {info.dueDay}</b>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <small className="mut">Tổng dư nợ hiện tại</small>
              <div
                className={info.debt > 0 ? 'exp' : 'inc'}
                style={{ fontSize: 20, fontWeight: 800 }}
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
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                <span className="mut">Khả dụng: {money(info.availableCredit)}</span>
                <span className="mut">
                  Hạn mức: {money(info.creditLimit)} ({info.utilizationPct}%)
                </span>
              </div>
              <div className="bar">
                <div
                  style={{
                    width: `${info.utilizationPct}%`,
                    background: info.utilizationPct > 80 ? 'var(--exp)' : fund.color,
                  }}
                />
              </div>
            </div>
          )}

          {/* Bóc tách rõ 2 kỳ sao kê để tránh nhầm lẫn hạn thanh toán */}
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
              }}
            >
              <div className="mut" style={{ fontSize: 11.5 }}>
                Kỳ đã chốt ({fmtDmy(info.lastStatementDate)})
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14.5,
                  marginTop: 3,
                  color: info.previousStatementDebt > 0 ? 'var(--exp)' : 'var(--inc)',
                }}
              >
                {info.previousStatementDebt > 0
                  ? money(info.previousStatementDebt)
                  : '0 ₫ (Đã tất toán)'}
              </div>
              <div className="mut" style={{ fontSize: 11, marginTop: 3 }}>
                Hạn TT gần nhất: <b>{fmtDmy(info.nextDueDate)}</b>
              </div>
            </div>

            <div
              style={{
                padding: '10px 11px',
                borderRadius: 12,
                border: '1px solid var(--bd)',
                background: 'color-mix(in srgb, var(--fg) 4%, transparent)',
              }}
            >
              <div className="mut" style={{ fontSize: 11.5 }}>
                Kỳ đang mở ({fmtDmy(info.lastStatementDate).slice(0, 5)} →{' '}
                {fmtDmy(info.nextStatementDate).slice(0, 5)})
              </div>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginTop: 3 }}>
                {money(info.currentCycleSpend)}
              </div>
              <div className="mut" style={{ fontSize: 11, marginTop: 3 }}>
                Hạn TT kỳ này: <b>{fmtDmy(info.nextCycleDueDate)}</b>
              </div>
            </div>
          </div>

          {/* Diễn giải thông minh */}
          <div
            style={{
              marginTop: 10,
              padding: '9px 11px',
              borderRadius: 10,
              fontSize: 12.5,
              lineHeight: 1.45,
              background:
                info.statusTag === 'due-soon'
                  ? 'rgba(239,68,68,0.12)'
                  : info.statusTag === 'optimal'
                    ? 'rgba(16,185,129,0.12)'
                    : 'color-mix(in srgb, var(--fg) 6%, transparent)',
              color:
                info.statusTag === 'due-soon'
                  ? 'var(--exp)'
                  : info.statusTag === 'optimal'
                    ? 'var(--inc)'
                    : 'var(--fg)',
            }}
          >
            {info.advice}
          </div>

          {onPayCard && info.debt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              {info.previousStatementDebt > 0 && info.previousStatementDebt < info.debt && (
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '7px 12px', fontSize: 12.5 }}
                  onClick={() =>
                    onPayCard(
                      fund,
                      info.previousStatementDebt,
                      `Thanh toán sao kê kỳ ${fmtDmy(info.lastStatementDate)} thẻ ${fund.name}`,
                    )
                  }
                >
                  Trả kỳ cũ ({money(info.previousStatementDebt)})
                </button>
              )}
              <button
                type="button"
                className="btn pri"
                style={{ padding: '7px 14px', fontSize: 12.5 }}
                onClick={() =>
                  onPayCard(fund, info.debt, `Tất toán dư nợ thẻ ${fund.name}`)
                }
              >
                Tất toán toàn bộ ({money(info.debt)})
              </button>
            </div>
          )}
        </div>

        {/* 2 Tab chuyển đổi: Giao dịch chi tiêu vs Quản lý Trả góp */}
        <div className="seg" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={activeTab === 'txs' ? 'on' : ''}
            onClick={() => setActiveTab('txs')}
          >
            📋 Giao dịch thẻ ({cardTxs.length})
          </button>
          <button
            type="button"
            className={activeTab === 'installments' ? 'on' : ''}
            onClick={() => setActiveTab('installments')}
          >
            📅 Trả góp 3/6/12/24 tháng ({installmentItems.length})
          </button>
        </div>

        {activeTab === 'txs' ? (
          <>
            {/* Bộ lọc kỳ sao kê */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <button
                type="button"
                className="pill-tag"
                style={{
                  cursor: 'pointer',
                  padding: '5px 10px',
                  fontSize: 12,
                  border:
                    cycleFilter === 'current'
                      ? '1px solid var(--acc)'
                      : '1px solid var(--bd)',
                  color: cycleFilter === 'current' ? 'var(--acc)' : 'var(--fg)',
                }}
                onClick={() => setCycleFilter('current')}
              >
                Kỳ đang mở ({fmtDmy(info.lastStatementDate).slice(0, 5)} →{' '}
                {fmtDmy(info.nextStatementDate).slice(0, 5)})
              </button>
              <button
                type="button"
                className="pill-tag"
                style={{
                  cursor: 'pointer',
                  padding: '5px 10px',
                  fontSize: 12,
                  border:
                    cycleFilter === 'previous'
                      ? '1px solid var(--acc)'
                      : '1px solid var(--bd)',
                  color: cycleFilter === 'previous' ? 'var(--acc)' : 'var(--fg)',
                }}
                onClick={() => setCycleFilter('previous')}
              >
                Kỳ trước ({fmtDmy(info.prevStatementDate).slice(0, 5)} →{' '}
                {fmtDmy(info.lastStatementDate).slice(0, 5)})
              </button>
              <button
                type="button"
                className="pill-tag"
                style={{
                  cursor: 'pointer',
                  padding: '5px 10px',
                  fontSize: 12,
                  border:
                    cycleFilter === 'all' ? '1px solid var(--acc)' : '1px solid var(--bd)',
                  color: cycleFilter === 'all' ? 'var(--acc)' : 'var(--fg)',
                }}
                onClick={() => setCycleFilter('all')}
              >
                Tất cả ({cardTxs.length})
              </button>
            </div>

            {/* Tóm tắt nhanh của kỳ đang chọn */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12.5,
                padding: '6px 4px 10px',
              }}
              className="mut"
            >
              <span>
                Chi tiêu kỳ này: <b className="exp">{money(filteredSummary.expense)}</b>
              </span>
              <span>
                Đã thanh toán / Hoàn: <b className="inc">+{money(filteredSummary.paid)}</b>
              </span>
            </div>

            <div className="card" style={{ padding: '4px 14px' }}>
              {filteredTxs.length === 0 && (
                <div className="empty" style={{ padding: '22px 0' }}>
                  Chưa có giao dịch nào trong kỳ sao kê này.
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
                    style={{
                      padding: '11px 0',
                      borderBottom: '1px solid var(--bd)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: onSelectTx ? 'pointer' : 'default',
                      }}
                      onClick={() => onSelectTx?.(t)}
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
                          <b style={{ fontSize: 14.5 }}>{catName}</b>
                          {instStatus && (
                            <span
                              className="pill-tag"
                              style={{
                                fontSize: 10.5,
                                color: 'var(--acc)',
                                borderColor: 'var(--acc)',
                              }}
                            >
                              📅 Trả góp {instStatus.termMonths} tháng ({instStatus.paidCycles}/
                              {instStatus.termMonths} kỳ)
                            </span>
                          )}
                        </div>
                        <small className="mut" style={{ display: 'block', marginTop: 2 }}>
                          {fmtDmy(t.date)}
                          {t.note ? ` · ${t.note}` : ''}
                        </small>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <b className={eff < 0 ? 'exp' : 'inc'} style={{ fontSize: 15 }}>
                          {eff < 0 ? `-${money(-eff)}` : `+${money(eff)}`}
                        </b>
                        {t.type === 'expense' && t.fundId === fund.id && (
                          <div style={{ marginTop: 4 }}>
                            <button
                              type="button"
                              className="pill-tag"
                              style={{
                                cursor: 'pointer',
                                fontSize: 11,
                                border: '1px solid var(--bd)',
                                color: instStatus ? 'var(--acc)' : 'var(--fg)',
                              }}
                              onClick={e => {
                                e.stopPropagation()
                                setConvertingTx(t)
                              }}
                            >
                              {instStatus
                                ? `⚙️ Còn ${instStatus.remainingCycles} kỳ (${money(instStatus.monthlyAmount)}/kỳ)`
                                : '🔄 Chuyển trả góp'}
                            </button>
                          </div>
                        )}
                      </div>
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
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                textAlign: 'center',
              }}
            >
              <div>
                <small className="mut">Đang trả góp</small>
                <div style={{ fontWeight: 800, fontSize: 16, marginTop: 2 }}>
                  {info.activeInstallmentsCount} khoản
                </div>
              </div>
              <div>
                <small className="mut">Đóng mỗi kỳ sao kê</small>
                <div
                  style={{ fontWeight: 800, fontSize: 15, marginTop: 2, color: 'var(--exp)' }}
                >
                  {money(info.monthlyInstallmentTotal)}/kỳ
                </div>
              </div>
              <div>
                <small className="mut">Dư nợ trả góp còn lại</small>
                <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2 }}>
                  {money(info.remainingInstallmentBalance)}
                </div>
              </div>
            </div>

            {installmentItems.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                <b>Chưa có giao dịch trả góp nào trên thẻ này</b>
                <p className="mut" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                  Hãy chuyển sang tab <b>"📋 Giao dịch thẻ"</b> và bấm nút{' '}
                  <b>"🔄 Chuyển trả góp"</b> ở bất kỳ khoản chi tiêu nào để chia kỳ hạn{' '}
                  <b>3, 6, 12 hoặc 24 tháng</b>.
                </p>
                <button
                  type="button"
                  className="btn pri"
                  style={{ marginTop: 12, padding: '8px 16px', fontSize: 13 }}
                  onClick={() => setActiveTab('txs')}
                >
                  Chọn giao dịch để chuyển trả góp
                </button>
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
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                        <div
                          className="ico"
                          style={{
                            background: (c?.color ?? fund.color) + '26',
                            width: 40,
                            height: 40,
                            fontSize: 20,
                          }}
                        >
                          {catIcon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <b style={{ fontSize: 15.5 }}>{tx.note || catName}</b>
                            <span
                              className="pill-tag"
                              style={{
                                color: st.isCompleted ? 'var(--inc)' : 'var(--acc)',
                                fontWeight: 700,
                              }}
                            >
                              Kỳ hạn {st.termMonths} tháng
                            </span>
                          </div>
                          <small className="mut" style={{ display: 'block', marginTop: 2 }}>
                            {catName} · Giao dịch gốc: {fmtDmy(tx.date)} ({money(tx.amount)})
                          </small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <small className="mut">Mỗi kỳ sao kê</small>
                        <div className="exp" style={{ fontWeight: 800, fontSize: 16 }}>
                          {money(st.monthlyAmount)}/kỳ
                        </div>
                      </div>
                    </div>

                    {/* Thông tin chi tiết: ngày bắt đầu chuyển đổi, kỳ sao kê, thời gian còn lại */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        marginTop: 12,
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: 'color-mix(in srgb, var(--fg) 4%, transparent)',
                        fontSize: 12.5,
                      }}
                    >
                      <div>
                        <span className="mut">Ngày bắt đầu chuyển đổi:</span>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>
                          {fmtDmy(st.startDate)}
                        </div>
                      </div>
                      <div>
                        <span className="mut">Bắt đầu ở kỳ sao kê:</span>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>
                          Chốt {fmtDmy(st.firstStatementDate)} (TT: {fmtDmy(st.firstDueDate)})
                        </div>
                      </div>
                      <div>
                        <span className="mut">Kỳ sao kê thanh toán tới:</span>
                        <div style={{ fontWeight: 600, marginTop: 2, color: 'var(--acc)' }}>
                          {st.nextPaymentStatementDate && st.nextPaymentDueDate
                            ? `Kỳ ${st.currentCycleNumber}/${st.termMonths} · Sao kê ${fmtDmy(st.nextPaymentStatementDate)} (TT ${fmtDmy(st.nextPaymentDueDate)})`
                            : '✅ Đã hoàn tất đủ các kỳ'}
                        </div>
                      </div>
                      <div>
                        <span className="mut">Thời gian còn lại:</span>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>
                          {st.remainingCycles > 0
                            ? `Còn ${st.remainingCycles} kỳ (~${st.remainingCycles} tháng · hết ${fmtDmy(st.finalDueDate)})`
                            : `Đã tất toán (${fmtDmy(st.finalDueDate)})`}
                        </div>
                      </div>
                    </div>

                    {/* Thanh tiến độ trả dần */}
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12,
                          marginBottom: 4,
                        }}
                      >
                        <span>
                          Đã trả: <b>{st.paidCycles}/{st.termMonths} kỳ</b> ({money(st.paidAmount)})
                        </span>
                        <span>
                          Còn lại: <b className="exp">{money(st.remainingBalance)}</b>
                        </span>
                      </div>
                      <div className="bar">
                        <div
                          style={{
                            width: `${progressPct}%`,
                            background: 'var(--acc)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Các nút thao tác: Cập nhật kỳ đã trả, Xem lịch các kỳ, Sửa */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          disabled={st.paidCycles <= 0}
                          onClick={() => handleStepPaidCycles(tx, st.paidCycles, -1)}
                        >
                          － 1 kỳ
                        </button>
                        <button
                          type="button"
                          className="btn pri"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          disabled={st.paidCycles >= st.termMonths}
                          onClick={() => handleStepPaidCycles(tx, st.paidCycles, 1)}
                        >
                          ＋ Đã trả thêm 1 kỳ
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() =>
                            setExpandedScheduleTxId(isExpanded ? null : (tx.id ?? null))
                          }
                        >
                          {isExpanded ? 'Ẩn lịch kỳ' : '📅 Lịch các kỳ'}
                        </button>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => setConvertingTx(tx)}
                        >
                          ⚙️ Sửa trả góp
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
                            <span>
                              <b>
                                Kỳ {item.cycleIndex}/{st.termMonths}
                              </b>{' '}
                              · Sao kê {fmtDmy(item.statementDate)} · Hạn TT {fmtDmy(item.dueDate)}
                            </span>
                            <span>
                              <b>{money(item.amount)}</b>{' '}
                              {item.status === 'paid'
                                ? '✅ Đã trả'
                                : item.status === 'current'
                                  ? '⏳ Kỳ hiện tại'
                                  : '📅 Sắp tới'}
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

        {/* Modal chuyển đổi / chỉnh sửa trả góp 3/6/12/24 tháng */}
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
