import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { addMonths } from 'date-fns'
import {
  db,
  syncSavingsGoalHistoryToTxs,
  type Fund,
  type SavingsAllocationLog,
  type SavingsGoal,
  type Tx,
} from '../db'
import {
  analyzeSavingsGoal,
  effectOn,
  evaluateKeypadExpression,
  findSavingsFund,
  fmtDmy,
  money,
  ymd,
} from '../lib'
import DatePickerModal from './DatePickerModal'
import { InAppSelect, fundsToSelectOptions } from './InAppSelectModal'
import { NumericInputBox } from './Keypad'
import { Colors } from './accounts/Colors'
import { COLORS } from './accounts/palette'
import { showAlert, showConfirm } from './AppDialog'

const NO_FUNDS: Fund[] = []
const NO_TXS: Tx[] = []
const NO_GOALS: SavingsGoal[] = []

const GOAL_PRESETS: Array<{ name: string; icon: string; color: string; suggestedTarget: number }> = [
  { name: 'Du lịch', icon: '✈️', color: '#3b82f6', suggestedTarget: 15_000_000 },
  { name: 'Mua sắm', icon: '🛍️', color: '#ec4899', suggestedTarget: 10_000_000 },
  { name: 'Khóa học', icon: '🎓', color: '#8b5cf6', suggestedTarget: 8_000_000 },
  { name: 'Quỹ dự phòng', icon: '🛡️', color: '#10b981', suggestedTarget: 30_000_000 },
  { name: 'Đổi thiết bị', icon: '💻', color: '#06b6d4', suggestedTarget: 25_000_000 },
  { name: 'Nhà cửa', icon: '🏠', color: '#f59e0b', suggestedTarget: 50_000_000 },
]

const GOAL_ICONS = ['✈️', '🛍️', '🎓', '🛡️', '💻', '🏠', '🚗', '💍', '👶', '🏥', '🎁', '🐷', '💎', '🎯']

function formatNumberInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

function parseNumberInput(raw: string): number {
  if (!raw) return 0
  return Math.max(0, Math.round(evaluateKeypadExpression(raw)))
}

export default function SavingsGoalsModal({
  initialGoalId,
  initialOpenCreate,
  onClose,
}: {
  initialGoalId?: number | null
  initialOpenCreate?: boolean
  onClose: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    void syncSavingsGoalHistoryToTxs()
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const funds = useLiveQuery(() => db.funds.toArray(), [], NO_FUNDS)
  const txs = useLiveQuery(() => db.txs.toArray(), [], NO_TXS)
  const goals = useLiveQuery(
    () => db.savingsGoals.toArray().catch(() => NO_GOALS),
    [],
    NO_GOALS,
  )

  const cashFunds = useMemo(
    () => funds.filter(f => f.kind !== 'credit' && !f.archived),
    [funds],
  )

  const defaultSavingsFund = useMemo(
    () => findSavingsFund(funds, goals[0]?.savingsFundId),
    [funds, goals],
  )

  const [selectedSavingsFundId, setSelectedSavingsFundId] = useState<number | null>(null)

  useEffect(() => {
    if (selectedSavingsFundId == null && defaultSavingsFund?.id) {
      setSelectedSavingsFundId(defaultSavingsFund.id)
    }
  }, [defaultSavingsFund, selectedSavingsFundId])

  const activeSavingsFund = useMemo(
    () =>
      cashFunds.find(f => f.id === selectedSavingsFundId) ??
      defaultSavingsFund ??
      cashFunds[0],
    [cashFunds, selectedSavingsFundId, defaultSavingsFund],
  )

  const balanceOfFund = (f: Fund | undefined) => {
    if (!f?.id) return 0
    return f.initialBalance + txs.reduce((acc, t) => acc + effectOn(t, f.id!), 0)
  }

  const savingsFundBalance = balanceOfFund(activeSavingsFund)
  const totalAllocated = useMemo(
    () => goals.reduce((sum, g) => sum + Math.max(0, g.allocatedAmount || 0), 0),
    [goals],
  )
  const unallocatedBalance = Math.max(0, savingsFundBalance - totalAllocated)
  const totalTarget = useMemo(
    () => goals.reduce((sum, g) => sum + Math.max(0, g.targetAmount || 0), 0),
    [goals],
  )
  const overallProgressPct =
    totalTarget > 0 ? Math.min(100, Math.round((totalAllocated / totalTarget) * 100)) : 0

  // Trạng thái mở chi tiết lộ trình của từng kế hoạch
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(initialGoalId ?? null)

  // Modal Thêm / Sửa kế hoạch
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(() => {
    if (!initialOpenCreate) return null
    const today = new Date()
    return {
      name: '',
      icon: '✈️',
      color: '#3b82f6',
      targetAmount: 15_000_000,
      allocatedAmount: 0,
      startDate: ymd(today),
      targetDate: ymd(addMonths(today, 6)),
      note: '',
      createdAt: Date.now(),
    }
  })

  // Modal Phân bổ / Rút tiền cho 1 kế hoạch
  const [allocateModal, setAllocateModal] = useState<{
    goal: SavingsGoal
    mode: 'add' | 'withdraw'
  } | null>(null)

  // Modal Nạp tiền từ Ví khác vào Quỹ Tiết Kiệm
  const [depositFromWalletOpen, setDepositFromWalletOpen] = useState(false)

  async function handleCreateDefaultSavingsWallet() {
    const id = await db.funds.add({
      name: 'Ví Tiết Kiệm',
      icon: '🐷',
      color: '#10b981',
      initialBalance: 0,
      kind: 'cash',
      excludeFromTotal: true,
      notifyOnTx: false,
      archived: false,
    })
    setSelectedSavingsFundId(id)
    await showAlert({
      title: 'Đã tạo Ví Tiết Kiệm',
      message:
        'Đã tạo "Ví Tiết Kiệm" (Không tính vào tổng). Bạn có thể nạp tiền từ các ví khác vào đây để phân bổ cho các kế hoạch.',
      icon: '🐷',
      tone: 'success',
    })
  }

  async function handleDeleteGoal(goal: SavingsGoal) {
    if (!goal.id) return
    const ok = await showConfirm({
      title: `Xoá kế hoạch "${goal.name}"?`,
      message:
        goal.allocatedAmount > 0
          ? `Số tiền ${money(goal.allocatedAmount)} đang phân bổ trong kế hoạch này sẽ được trả về "Số dư chưa phân bổ" của Quỹ Tiết Kiệm (không làm mất tiền trong ví).`
          : 'Bạn có chắc chắn muốn xoá kế hoạch tiết kiệm này không?',
      icon: goal.icon,
      danger: true,
      confirmText: 'Xoá kế hoạch',
    })
    if (ok) {
      await db.savingsGoals.delete(goal.id)
      if (expandedGoalId === goal.id) setExpandedGoalId(null)
    }
  }

  function openNewGoalModal() {
    const today = new Date()
    setEditingGoal({
      name: '',
      icon: '✈️',
      color: '#3b82f6',
      targetAmount: 15_000_000,
      allocatedAmount: 0,
      savingsFundId: activeSavingsFund?.id ?? null,
      startDate: ymd(today),
      targetDate: ymd(addMonths(today, 6)),
      note: '',
      createdAt: Date.now(),
    })
  }

  // Nếu người dùng bấm "+ Kế hoạch" trực tiếp từ trang Ví của tôi:
  // Chỉ mở thẳng form Tạo kế hoạch, bấm Lưu hoặc Huỷ sẽ quay về Ví của tôi ngay lập tức.
  if (initialOpenCreate && editingGoal) {
    const directForm = (
      <SavingsGoalFormModal
        initial={editingGoal}
        unallocatedBalance={unallocatedBalance}
        activeSavingsFund={activeSavingsFund}
        onClose={onClose}
        onSaved={() => onClose()}
      />
    )
    return typeof document !== 'undefined' ? createPortal(directForm, document.body) : directForm
  }

  const content = (
    <div
      className="sheetbg"
      style={{ zIndex: 78 }}
      onClick={onClose}
    >
      <div
        className="sheet"
        style={{
          maxWidth: 560,
          margin: '0 auto',
          maxHeight: '92dvh',
          overflowY: 'auto',
          padding: '16px 16px calc(28px + env(safe-area-inset-bottom))',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Thanh tiêu đề gọn gàng */}
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
            }}
          >
            🐷 Quỹ Tiết Kiệm
          </b>
          <button
            type="button"
            className="btn pri"
            style={{ padding: '6px 11px', fontSize: 12.5, whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={openNewGoalModal}
          >
            + Kế hoạch
          </button>
        </div>

        {/* Thẻ Tổng quan Quỹ Tiết Kiệm */}
        <div
          className="card"
          style={{
            border: '1px solid rgba(16, 185, 129, 0.35)',
            background:
              'linear-gradient(165deg, rgba(16, 185, 129, 0.12), rgba(20, 184, 166, 0.04))',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5 }} className="mut">
                Ví nguồn tiết kiệm:
              </span>
              {cashFunds.length > 0 ? (
                <InAppSelect<number>
                  variant="pill"
                  title="Chọn Ví nguồn tiết kiệm"
                  value={activeSavingsFund?.id ?? cashFunds[0]?.id ?? 0}
                  options={fundsToSelectOptions(cashFunds, txs)}
                  onChange={v => setSelectedSavingsFundId(Number(v))}
                />
              ) : (
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: 12 }}
                  onClick={handleCreateDefaultSavingsWallet}
                >
                  + Tạo Ví Tiết Kiệm
                </button>
              )}
            </div>
            {!cashFunds.some(f => /tiết kiệm|tiet kiem|saving/i.test(f.name)) && (
              <button
                type="button"
                className="pill-tag"
                style={{
                  cursor: 'pointer',
                  border: '1px dashed rgba(16,185,129,0.5)',
                  color: 'var(--inc)',
                  background: 'transparent',
                }}
                onClick={handleCreateDefaultSavingsWallet}
              >
                + Tạo ví Tiết Kiệm riêng
              </button>
            )}
          </div>

          {/* 3 chỉ số dòng tiền Tiết kiệm */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
              background: 'var(--card)',
              borderRadius: 12,
              padding: '10px 8px',
              border: '1px solid var(--bd)',
              textAlign: 'center',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <small className="mut" style={{ fontSize: 11, display: 'block' }}>
                Số dư quỹ
              </small>
              <b
                style={{
                  fontSize: 13.5,
                  display: 'block',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {money(savingsFundBalance)}
              </b>
            </div>
            <div
              style={{
                minWidth: 0,
                borderLeft: '1px solid var(--bd)',
                borderRight: '1px solid var(--bd)',
                padding: '0 4px',
              }}
            >
              <small className="mut" style={{ fontSize: 11, display: 'block' }}>
                Đã phân bổ
              </small>
              <b
                className="inc"
                style={{
                  fontSize: 13.5,
                  display: 'block',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {money(totalAllocated)}
              </b>
            </div>
            <div style={{ minWidth: 0 }}>
              <small className="mut" style={{ fontSize: 11, display: 'block' }}>
                Chưa phân bổ
              </small>
              <b
                style={{
                  fontSize: 13.5,
                  display: 'block',
                  marginTop: 2,
                  color: unallocatedBalance > 0 ? '#eab308' : 'var(--mut)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {money(unallocatedBalance)}
              </b>
            </div>
          </div>

          {totalTarget > 0 && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  marginBottom: 4,
                  flexWrap: 'wrap',
                  gap: 4,
                }}
              >
                <span className="mut">
                  Tổng tiến độ ({goals.length} kế hoạch):{' '}
                  <b style={{ color: 'var(--fg)' }}>{overallProgressPct}%</b>
                </span>
                <span className="mut">
                  Mục tiêu: <b style={{ color: 'var(--fg)' }}>{money(totalTarget)}</b>
                </span>
              </div>
              <div className="bar" style={{ height: 8, marginTop: 0 }}>
                <div
                  style={{
                    width: `${overallProgressPct > 0 ? Math.max(4, overallProgressPct) : 0}%`,
                    background: '#10b981',
                  }}
                />
              </div>
            </div>
          )}

          {/* Nút tác vụ dòng tiền (chỉ giữ 1 nút Nạp từ ví khác, bỏ nút Thêm kế hoạch bị trùng) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <button
              type="button"
              className="btn pri"
              style={{ width: '100%', padding: '9px 14px', fontSize: 13 }}
              onClick={() => setDepositFromWalletOpen(true)}
            >
              📥 Nạp tiền từ ví khác vào Quỹ Tiết Kiệm
            </button>
          </div>
        </div>

        {/* Danh sách các Kế hoạch Tiết kiệm */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          <h2 style={{ margin: 0 }}>KẾ HOẠCH MỤC TIÊU ({goals.length})</h2>
          {unallocatedBalance > 0 && goals.length > 0 && (
            <small className="inc" style={{ fontSize: 12 }}>
              Còn {money(unallocatedBalance)} sẵn sàng phân bổ
            </small>
          )}
        </div>

        {goals.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '22px 16px' }}>
            <div style={{ fontSize: 34, marginBottom: 6 }}>🎯</div>
            <b style={{ fontSize: 15 }}>Chưa có kế hoạch tiết kiệm nào</b>
            <p className="mut" style={{ fontSize: 12.5, margin: '6px 0 12px', lineHeight: 1.45 }}>
              Bấm nút <b>"+ Kế hoạch"</b> ở góc trên hoặc chạm nhanh vào một mẫu mục tiêu bên dưới:
            </p>
            <div
              style={{
                display: 'flex',
                gap: 6,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              {GOAL_PRESETS.slice(0, 4).map(p => (
                <button
                  key={p.name}
                  type="button"
                  className="btn"
                  style={{ padding: '6px 11px', fontSize: 12.5, borderRadius: 99 }}
                  onClick={() => {
                    const today = new Date()
                    setEditingGoal({
                      name: p.name,
                      icon: p.icon,
                      color: p.color,
                      targetAmount: p.suggestedTarget,
                      allocatedAmount: 0,
                      savingsFundId: activeSavingsFund?.id ?? null,
                      startDate: ymd(today),
                      targetDate: ymd(addMonths(today, 6)),
                      note: '',
                      createdAt: Date.now(),
                    })
                  }}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          goals.map(g => {
            const info = analyzeSavingsGoal(g)
            const isExpanded = expandedGoalId === g.id
            const badgeColor =
              info.status === 'completed'
                ? '#10b981'
                : info.status === 'overdue'
                  ? '#ef4444'
                  : info.status === 'behind'
                    ? '#f59e0b'
                    : '#3b82f6'

            return (
              <div
                key={g.id}
                className="card"
                style={{
                  marginBottom: 12,
                  border: isExpanded ? `1px solid ${g.color}88` : undefined,
                }}
              >
                {/* Hàng 1: Icon + Tên + Trạng thái */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <div
                    className="ico round"
                    style={{
                      background: g.color + '28',
                      border: `1px solid ${g.color}55`,
                      flexShrink: 0,
                    }}
                  >
                    {g.icon}
                  </div>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <b style={{ fontSize: 16 }}>{g.name}</b>
                      <span
                        className="pill-tag"
                        style={{
                          background: badgeColor + '22',
                          color: badgeColor,
                          border: `1px solid ${badgeColor}44`,
                          fontSize: 11,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {info.statusLabel}
                      </span>
                    </div>

                    {/* Hàng 2: Số tiền Đã phân bổ / Mục tiêu */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginTop: 6,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>
                        <b className="inc">{money(info.allocatedAmount)}</b>{' '}
                        <span className="mut">/ {money(info.targetAmount)}</span>
                      </span>
                      <b style={{ fontSize: 13, color: g.color }}>{info.progressPct}%</b>
                    </div>

                    {/* Hàng 3: Thanh tiến độ */}
                    <div className="bar" style={{ height: 8, marginTop: 6 }}>
                      <div
                        style={{
                          width: `${
                            info.allocatedAmount > 0 ? Math.max(4, info.progressPct) : 0
                          }%`,
                          background: info.isCompleted ? '#10b981' : g.color,
                        }}
                      />
                    </div>

                    {/* Hàng 4: Thông tin kiểm soát thời gian & định mức mỗi tháng */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 8,
                        marginTop: 10,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: 'var(--bg)',
                        border: '1px solid var(--bd)',
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <span className="mut" style={{ display: 'block', fontSize: 11 }}>
                          Đích đến ({fmtDmy(g.targetDate)})
                        </span>
                        <b style={{ display: 'block', marginTop: 2 }}>
                          {info.isCompleted
                            ? '🎉 Đã hoàn thành'
                            : info.isOverdue
                              ? `Quá hạn ${Math.abs(info.daysRemaining)} ngày`
                              : `Còn ${info.remainingMonths} tháng (${Math.max(0, info.daysRemaining)} ngày)`}
                        </b>
                      </div>
                      <div>
                        <span className="mut" style={{ display: 'block', fontSize: 11 }}>
                          {info.isCompleted ? 'Số tiền còn thiếu' : 'Cần tích lũy mỗi tháng'}
                        </span>
                        <b
                          style={{
                            display: 'block',
                            marginTop: 2,
                            color: info.isCompleted ? 'var(--inc)' : 'var(--fg)',
                          }}
                        >
                          {info.isCompleted
                            ? '0 ₫ (Đủ 100%)'
                            : `${money(info.monthlyNeededNow)} / tháng`}
                        </b>
                      </div>
                    </div>

                    {!info.isCompleted && (
                      <div
                        className="mut"
                        style={{
                          fontSize: 12,
                          marginTop: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 4,
                        }}
                      >
                        <span>
                          Còn thiếu: <b style={{ color: 'var(--fg)' }}>{money(info.remainingAmount)}</b>
                        </span>
                        <span>
                          Mốc tháng này:{' '}
                          <b style={{ color: 'var(--fg)' }}>{money(info.plannedCumulativeNow)}</b>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cụm nút hành động của từng Kế hoạch */}
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    marginTop: 12,
                    flexWrap: 'wrap',
                    borderTop: '1px solid var(--bd)',
                    paddingTop: 10,
                  }}
                >
                  <button
                    type="button"
                    className="btn pri"
                    style={{ padding: '6px 11px', fontSize: 12.5, flex: 1, whiteSpace: 'nowrap' }}
                    onClick={() => setAllocateModal({ goal: g, mode: 'add' })}
                  >
                    ➕ Phân bổ tiền
                  </button>
                  {g.allocatedAmount > 0 && (
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '6px 10px', fontSize: 12.5, whiteSpace: 'nowrap' }}
                      onClick={() => setAllocateModal({ goal: g, mode: 'withdraw' })}
                    >
                      ➖ Rút bớt
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: '6px 10px', fontSize: 12.5, whiteSpace: 'nowrap' }}
                    onClick={() => setExpandedGoalId(isExpanded ? null : g.id!)}
                  >
                    🎯 {isExpanded ? 'Ẩn lộ trình' : 'Lộ trình 0–50–100%'}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ padding: '6px 10px', fontSize: 12.5, whiteSpace: 'nowrap' }}
                    onClick={() => setEditingGoal(g)}
                    title="Chỉnh sửa kế hoạch"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    type="button"
                    className="btn dng"
                    style={{ padding: '6px 10px', fontSize: 12.5, whiteSpace: 'nowrap' }}
                    onClick={() => handleDeleteGoal(g)}
                    title="Xoá kế hoạch"
                  >
                    🗑️
                  </button>
                </div>

                {/* Lộ trình 3 giai đoạn tinh gọn: 0% -> 50% -> 100% (vẫn giữ Tháng mục tiêu) */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px dashed var(--bd)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                        flexWrap: 'wrap',
                        gap: 4,
                      }}
                    >
                      <b style={{ fontSize: 13 }}>
                        🎯 Lộ trình giai đoạn (0% → 50% → 100%)
                      </b>
                      <span
                        className="pill-tag"
                        style={{
                          fontSize: 11,
                          background: 'color-mix(in srgb, var(--acc) 16%, transparent)',
                          color: 'var(--acc)',
                        }}
                      >
                        Tháng mục tiêu: {info.targetMonthLabel}
                      </span>
                    </div>

                    {/* Thanh tiến độ 3 cột mốc trực quan 0% - 50% - 100% */}
                    <div
                      style={{
                        position: 'relative',
                        padding: '6px 4px 10px',
                        marginBottom: 8,
                      }}
                    >
                      <div className="bar" style={{ height: 8, margin: '8px 0' }}>
                        <div
                          style={{
                            width: `${
                              info.allocatedAmount > 0 ? Math.max(4, info.progressPct) : 0
                            }%`,
                            background: info.isCompleted ? '#10b981' : g.color,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        <span className="inc">● 0% ({info.startMonthLabel})</span>
                        <span
                          style={{
                            color: info.progressPct >= 50 ? 'var(--inc)' : 'var(--mut)',
                          }}
                        >
                          ● 50% ({info.halfwayMonthLabel})
                        </span>
                        <span
                          style={{
                            color: info.isCompleted ? 'var(--inc)' : 'var(--fg)',
                          }}
                        >
                          🏁 100% ({info.targetMonthLabel})
                        </span>
                      </div>
                    </div>

                    {/* 3 Thẻ giai đoạn 0% - 50% - 100% gọn gàng */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {info.stageRoadmap.map(st => (
                        <div
                          key={st.stagePct}
                          style={{
                            padding: '9px 11px',
                            borderRadius: 10,
                            background: st.isCurrentStage
                              ? 'rgba(59, 130, 246, 0.11)'
                              : 'var(--bg)',
                            border: st.isCurrentStage
                              ? '1px solid rgba(59, 130, 246, 0.45)'
                              : '1px solid var(--bd)',
                            fontSize: 12.5,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 6,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <b>{st.title}</b>
                              <span
                                className="pill-tag"
                                style={{
                                  fontSize: 10.5,
                                  color: st.isAchieved ? '#10b981' : '#3b82f6',
                                  background: st.isAchieved
                                    ? 'rgba(16,185,129,0.16)'
                                    : 'rgba(59,130,246,0.16)',
                                }}
                              >
                                {st.stagePct === 100
                                  ? `Tháng đích: ${st.monthLabel}`
                                  : `Tháng ${st.monthLabel}`}
                              </span>
                            </div>
                            <b style={{ color: st.isAchieved ? 'var(--inc)' : 'var(--fg)' }}>
                              {st.stagePct === 0 ? 'Bắt đầu' : money(st.targetAmountAtStage)}
                            </b>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: 4,
                              fontSize: 11.5,
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            {st.stagePct === 0 ? (
                              <>
                                <span className="mut">Ngày bắt đầu: {st.dateLabel}</span>
                                <span className="mut">
                                  Định mức đều:{' '}
                                  <b style={{ color: 'var(--fg)' }}>
                                    {info.isCompleted
                                      ? 'Đã hoàn tất'
                                      : `${money(info.monthlyNeededNow)}/tháng`}
                                  </b>
                                </span>
                              </>
                            ) : st.isAchieved ? (
                              <>
                                <span className="inc">
                                  ✓ Đã hoàn thành cột mốc {st.stagePct}%
                                </span>
                                <span className="mut">{st.dateLabel}</span>
                              </>
                            ) : (
                              <>
                                <span className="mut">
                                  Còn thiếu tới mốc {st.stagePct}%:{' '}
                                  <b style={{ color: 'var(--fg)' }}>
                                    {money(st.remainingToReachStage)}
                                  </b>
                                </span>
                                <span className="mut">
                                  Dự kiến còn <b>{st.monthsToReachStage} tháng</b> ({st.dateLabel})
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Lịch sử phân bổ / rút tiền của kế hoạch */}
                    {g.history && g.history.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <b style={{ fontSize: 12.5, display: 'block', marginBottom: 6 }}>
                          🕒 Lịch sử phân bổ ({g.history.length} lần)
                        </b>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {g.history
                            .slice()
                            .reverse()
                            .slice(0, 8)
                            .map(h => {
                              const fromWallet = h.fromFundId
                                ? funds.find(f => f.id === h.fromFundId)
                                : null
                              return (
                                <div
                                  key={h.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: 12,
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    background: 'var(--bg)',
                                    border: '1px solid var(--bd)',
                                  }}
                                >
                                  <span className="mut">
                                    {fmtDmy(h.date)} ·{' '}
                                    {fromWallet
                                      ? `Từ ${fromWallet.name}`
                                      : h.amount >= 0
                                        ? 'Phân bổ từ Quỹ Tiết Kiệm'
                                        : 'Rút về Quỹ Tiết Kiệm'}
                                    {h.note ? ` (${h.note})` : ''}
                                  </span>
                                  <b className={h.amount >= 0 ? 'inc' : 'exp'}>
                                    {h.amount >= 0 ? '+' : ''}
                                    {money(h.amount)}
                                  </b>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Modal con 1: Thêm / Chỉnh sửa Kế hoạch Tiết kiệm */}
        {editingGoal && (
          <SavingsGoalFormModal
            initial={editingGoal}
            unallocatedBalance={unallocatedBalance}
            activeSavingsFund={activeSavingsFund}
            onClose={() => setEditingGoal(null)}
            onSaved={savedId => {
              setEditingGoal(null)
              if (savedId) setExpandedGoalId(savedId)
            }}
          />
        )}

        {/* Modal con 2: Phân bổ / Rút tiền cho 1 Kế hoạch */}
        {allocateModal && (
          <AllocateToGoalModal
            goal={allocateModal.goal}
            mode={allocateModal.mode}
            cashFunds={cashFunds}
            activeSavingsFund={activeSavingsFund}
            unallocatedBalance={unallocatedBalance}
            balanceOfFund={balanceOfFund}
            onClose={() => setAllocateModal(null)}
          />
        )}

        {/* Modal con 3: Nạp tiền từ các Quỹ Ví khác vào Quỹ Tiết Kiệm */}
        {depositFromWalletOpen && (
          <DepositToSavingsModal
            cashFunds={cashFunds}
            activeSavingsFund={activeSavingsFund}
            goals={goals}
            balanceOfFund={balanceOfFund}
            onClose={() => setDepositFromWalletOpen(false)}
          />
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content
}

function SavingsGoalFormModal({
  initial,
  unallocatedBalance,
  activeSavingsFund,
  onClose,
  onSaved,
}: {
  initial: SavingsGoal
  unallocatedBalance: number
  activeSavingsFund?: Fund
  onClose: () => void
  onSaved: (id?: number) => void
}) {
  const isEdit = Boolean(initial.id)
  const [name, setName] = useState(initial.name)
  const [icon, setIcon] = useState(initial.icon || '✈️')
  const [color, setColor] = useState(initial.color || COLORS[0])
  const [targetRaw, setTargetRaw] = useState(
    initial.targetAmount > 0 ? formatNumberInput(String(initial.targetAmount)) : '',
  )
  const [allocatedRaw, setAllocatedRaw] = useState(
    initial.allocatedAmount > 0 ? formatNumberInput(String(initial.allocatedAmount)) : '0',
  )
  const [startDate, setStartDate] = useState(initial.startDate || ymd(new Date()))
  const [targetDate, setTargetDate] = useState(
    initial.targetDate || ymd(addMonths(new Date(), 6)),
  )
  const [note, setNote] = useState(initial.note || '')
  const [pickDateField, setPickDateField] = useState<'start' | 'target' | null>(null)

  const targetAmount = parseNumberInput(targetRaw)
  const allocatedAmount = parseNumberInput(allocatedRaw)

  const previewAnalysis = useMemo(
    () =>
      analyzeSavingsGoal({
        ...initial,
        name: name || 'Kế hoạch',
        icon,
        color,
        targetAmount,
        allocatedAmount,
        startDate,
        targetDate,
      }),
    [initial, name, icon, color, targetAmount, allocatedAmount, startDate, targetDate],
  )

  function applyQuickMonths(monthsCount: number) {
    const base = new Date(startDate + 'T00:00:00')
    const validBase = Number.isNaN(base.getTime()) ? new Date() : base
    setTargetDate(ymd(addMonths(validBase, monthsCount)))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      await showAlert({
        title: 'Thiếu tên kế hoạch',
        message: 'Vui lòng nhập tên kế hoạch tiết kiệm (ví dụ: Du lịch, Mua sắm, Khóa học...).',
        tone: 'warning',
      })
      return
    }
    if (targetAmount <= 0) {
      await showAlert({
        title: 'Số tiền mục tiêu chưa hợp lệ',
        message: 'Vui lòng nhập số tiền mục tiêu lớn hơn 0 ₫.',
        tone: 'warning',
      })
      return
    }
    if (targetDate < startDate) {
      await showAlert({
        title: 'Ngày mục tiêu chưa hợp lệ',
        message: 'Ngày hoàn thành mục tiêu phải lớn hơn hoặc bằng ngày bắt đầu.',
        tone: 'warning',
      })
      return
    }

    const sFundId = activeSavingsFund?.id ?? initial.savingsFundId ?? null
    const sFundName = activeSavingsFund?.name ?? 'Ví Tiết Kiệm'
    const payload: SavingsGoal = {
      ...initial,
      name: name.trim(),
      icon,
      color,
      targetAmount,
      allocatedAmount,
      savingsFundId: sFundId,
      startDate,
      targetDate,
      note: note.trim(),
      createdAt: initial.createdAt || Date.now(),
    }

    if (initial.id) {
      const delta = allocatedAmount - (initial.allocatedAmount || 0)
      const nextHistory = [...(initial.history ?? [])]
      if (delta !== 0) {
        const logId = (delta > 0 ? 'a-edit-' : 'w-edit-') + Date.now()
        const todayStr = ymd(new Date())
        nextHistory.push({
          id: logId,
          date: todayStr,
          amount: delta,
          note: delta > 0 ? 'Điều chỉnh tăng phân bổ mục tiêu' : 'Điều chỉnh giảm phân bổ mục tiêu',
        })
        if (sFundId) {
          await db.txs.add({
            type: 'transfer',
            amount: Math.abs(delta),
            date: todayStr,
            fundId: sFundId,
            toFundId: sFundId,
            categoryId: null,
            note:
              delta > 0
                ? `Phân bổ từ ${sFundName} → Mục tiêu "${name.trim()}"`
                : `Rút từ Mục tiêu "${name.trim()}" → ${sFundName}`,
            createdAt: Date.now(),
            excludeFromReport: true,
            savingsGoalId: initial.id,
            savingsGoalName: name.trim(),
            savingsGoalIcon: icon,
            savingsAction: delta > 0 ? 'allocate' : 'withdraw',
            savingsLogId: logId,
          })
        }
      }
      await db.savingsGoals.put({ ...payload, id: initial.id, history: nextHistory })
      onSaved(initial.id)
    } else {
      const initLogId = 'init-' + Date.now()
      const todayStr = ymd(new Date())
      const history: SavingsAllocationLog[] =
        allocatedAmount > 0
          ? [
              {
                id: initLogId,
                date: todayStr,
                amount: allocatedAmount,
                note: 'Phân bổ ban đầu',
              },
            ]
          : []
      const newId = await db.savingsGoals.add({ ...payload, history })
      if (allocatedAmount > 0 && sFundId) {
        await db.txs.add({
          type: 'transfer',
          amount: allocatedAmount,
          date: todayStr,
          fundId: sFundId,
          toFundId: sFundId,
          categoryId: null,
          note: `Phân bổ ban đầu từ ${sFundName} → Mục tiêu "${name.trim()}"`,
          createdAt: Date.now(),
          excludeFromReport: true,
          savingsGoalId: newId,
          savingsGoalName: name.trim(),
          savingsGoalIcon: icon,
          savingsAction: 'allocate',
          savingsLogId: initLogId,
        })
      }
      onSaved(newId)
    }
  }

  return (
    <div
      className="sheetbg"
      style={{ zIndex: 90 }}
      onClick={onClose}
    >
      <form
        className="sheet"
        style={{ maxHeight: '90dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
        onSubmit={handleSave}
      >
        <div className="ledger-topbar" style={{ marginBottom: 12 }}>
          <button type="button" className="close-pill-btn" onClick={onClose}>
            Huỷ
          </button>
          <b style={{ fontSize: 16 }}>
            {isEdit ? 'Sửa kế hoạch' : '🎯 Tạo kế hoạch mới'}
          </b>
          <button type="submit" className="close-pill-btn" style={{ color: 'var(--acc)' }}>
            Lưu
          </button>
        </div>

        {/* Gợi ý mẫu nhanh */}
        {!isEdit && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--mut)', display: 'block', marginBottom: 6 }}>
              Chọn nhanh mẫu kế hoạch
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {GOAL_PRESETS.map(p => (
                <button
                  key={p.name}
                  type="button"
                  className="btn"
                  style={{
                    padding: '6px 10px',
                    fontSize: 12.5,
                    borderRadius: 99,
                    borderColor: name === p.name ? 'var(--acc)' : undefined,
                    background:
                      name === p.name
                        ? 'color-mix(in srgb, var(--acc) 16%, var(--card))'
                        : undefined,
                  }}
                  onClick={() => {
                    setName(p.name)
                    setIcon(p.icon)
                    setColor(p.color)
                    setTargetRaw(formatNumberInput(String(p.suggestedTarget)))
                  }}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="fld">
          <span>Tên mục tiêu / kế hoạch</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Du lịch Nhật Bản, Mua Macbook, Khóa học IELTS..."
            required
          />
        </label>

        <div className="fld" style={{ marginBottom: 6 }}>
          <span>Số tiền mục tiêu (₫)</span>
          <NumericInputBox
            value={targetRaw}
            onChange={setTargetRaw}
            placeholder="VD: 15,000,000"
            suffix="₫"
            suggestions={[5000000, 10000000, 20000000, 30000000, 50000000]}
            variant="box"
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {[5_000_000, 10_000_000, 20_000_000, 30_000_000, 50_000_000, 100_000_000].map(v => (
            <button
              key={v}
              type="button"
              className="btn"
              style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 99 }}
              onClick={() => setTargetRaw(formatNumberInput(String(v)))}
            >
              {v >= 1_000_000 ? `${v / 1_000_000}tr` : money(v)}
            </button>
          ))}
        </div>

        <div className="fld">
          <span>
            Số tiền đã phân bổ vào kế hoạch (₫){' '}
            {unallocatedBalance > 0 && (
              <small className="inc" style={{ fontWeight: 400 }}>
                (Chưa phân bổ: {money(unallocatedBalance)})
              </small>
            )}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumericInputBox
                variant="field"
                value={allocatedRaw}
                onChange={setAllocatedRaw}
                placeholder="0"
                suffix="₫"
                allowZeroDisplay
              />
            </div>
            {unallocatedBalance > 0 && (
              <button
                type="button"
                className="btn"
                style={{ whiteSpace: 'nowrap', fontSize: 12 }}
                onClick={() => {
                  const maxUse =
                    targetAmount > 0
                      ? Math.min(unallocatedBalance, targetAmount)
                      : unallocatedBalance
                  setAllocatedRaw(formatNumberInput(String(maxUse)))
                }}
              >
                Lấy số dư rỗi
              </button>
            )}
          </div>
        </div>

        {/* Thời gian bắt đầu & hoàn thành */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="fld" style={{ marginBottom: 6 }}>
            <span>Ngày bắt đầu</span>
            <button
              type="button"
              className="btn"
              style={{ width: '100%', textAlign: 'left', padding: '10px 12px' }}
              onClick={() => setPickDateField('start')}
            >
              📅 {fmtDmy(startDate)}
            </button>
          </div>
          <div className="fld" style={{ marginBottom: 6 }}>
            <span>Hạn đạt mục tiêu</span>
            <button
              type="button"
              className="btn"
              style={{ width: '100%', textAlign: 'left', padding: '10px 12px' }}
              onClick={() => setPickDateField('target')}
            >
              🏁 {fmtDmy(targetDate)}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <small className="mut" style={{ alignSelf: 'center', fontSize: 11.5 }}>
            Kỳ hạn nhanh:
          </small>
          {[3, 6, 12, 18, 24].map(m => (
            <button
              key={m}
              type="button"
              className="btn"
              style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 99 }}
              onClick={() => applyQuickMonths(m)}
            >
              {m} tháng
            </button>
          ))}
        </div>

        {/* Xem trước lộ trình tính toán tự động */}
        {targetAmount > 0 && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.09)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            <div>
              📊 <b>Tóm tắt lộ trình ({previewAnalysis.totalMonths} tháng):</b>
            </div>
            <div>
              • Còn cần tích lũy: <b>{money(previewAnalysis.remainingAmount)}</b> trong{' '}
              <b>{previewAnalysis.remainingMonths} tháng</b> tới.
            </div>
            <div>
              • Định mức đều đặn:{' '}
              <b className="inc">{money(previewAnalysis.monthlyNeededNow)} / tháng</b> để cán đích
              đúng hạn <b>{fmtDmy(targetDate)}</b>.
            </div>
          </div>
        )}

        <div className="fld">
          <span>Biểu tượng</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GOAL_ICONS.map(ic => (
              <button
                type="button"
                key={ic}
                className="btn"
                style={{
                  padding: '6px 10px',
                  fontSize: 18,
                  borderColor: icon === ic ? 'var(--acc)' : undefined,
                  background:
                    icon === ic
                      ? 'color-mix(in srgb, var(--acc) 18%, var(--card))'
                      : undefined,
                }}
                onClick={() => setIcon(ic)}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <Colors v={color} on={setColor} />

        <label className="fld" style={{ marginTop: 10 }}>
          <span>Ghi chú (tuỳ chọn)</span>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="VD: Trích 10% lương hàng tháng..."
          />
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="btn pri" style={{ flex: 1 }}>
            Lưu kế hoạch
          </button>
        </div>

        {pickDateField && (
          <DatePickerModal
            value={pickDateField === 'start' ? startDate : targetDate}
            onClose={() => setPickDateField(null)}
            onChange={d => {
              if (pickDateField === 'start') setStartDate(d)
              else setTargetDate(d)
            }}
          />
        )}
      </form>
    </div>
  )
}

function AllocateToGoalModal({
  goal,
  mode,
  cashFunds,
  activeSavingsFund,
  unallocatedBalance,
  balanceOfFund,
  onClose,
}: {
  goal: SavingsGoal
  mode: 'add' | 'withdraw'
  cashFunds: Fund[]
  activeSavingsFund?: Fund
  unallocatedBalance: number
  balanceOfFund: (f: Fund | undefined) => number
  onClose: () => void
}) {
  const info = analyzeSavingsGoal(goal)
  const otherWallets = cashFunds.filter(f => f.id !== activeSavingsFund?.id)

  const [sourceType, setSourceType] = useState<'unallocated' | 'other_wallet'>(
    mode === 'add' && unallocatedBalance <= 0 && otherWallets.length > 0
      ? 'other_wallet'
      : 'unallocated',
  )
  const [withdrawTargetType, setWithdrawTargetType] = useState<'to_savings' | 'to_other_wallet'>('to_savings')
  const [fromWalletId, setFromWalletId] = useState<number>(
    otherWallets[0]?.id ?? activeSavingsFund?.id ?? 0,
  )
  const [amountRaw, setAmountRaw] = useState(() => {
    if (mode === 'withdraw') return ''
    const suggested = Math.min(
      info.remainingAmount || 1_000_000,
      info.monthlyNeededNow || 1_000_000,
    )
    return suggested > 0 ? formatNumberInput(String(suggested)) : ''
  })
  const [note, setNote] = useState('')

  const amount = parseNumberInput(amountRaw)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!goal.id || amount <= 0) {
      await showAlert({
        title: 'Số tiền chưa hợp lệ',
        message: 'Vui lòng nhập số tiền lớn hơn 0 ₫.',
        tone: 'warning',
      })
      return
    }

    const sFundId = activeSavingsFund?.id ?? goal.savingsFundId ?? cashFunds[0]?.id
    const sFundName = activeSavingsFund?.name ?? 'Ví Tiết Kiệm'
    const todayStr = ymd(new Date())
    const nowTs = Date.now()

    if (mode === 'withdraw') {
      if (amount > goal.allocatedAmount) {
        await showAlert({
          title: 'Vượt quá số tiền đã phân bổ',
          message: `Kế hoạch "${goal.name}" hiện chỉ có ${money(goal.allocatedAmount)}.`,
          tone: 'warning',
        })
        return
      }
      const nextAllocated = Math.max(0, goal.allocatedAmount - amount)
      const toWallet = withdrawTargetType === 'to_other_wallet' ? cashFunds.find(f => f.id === fromWalletId) : undefined
      const logId = 'w-' + nowTs
      const logNote =
        note.trim() ||
        (toWallet
          ? `Rút từ mục tiêu về ${toWallet.name}`
          : `Rút về số dư rỗi ${sFundName}`)

      const logItem: SavingsAllocationLog = {
        id: logId,
        date: todayStr,
        amount: -amount,
        fromFundId: toWallet?.id ?? null,
        note: logNote,
      }

      if (sFundId) {
        // 1. Ghi nhận giao dịch rút từ Mục tiêu -> Ví Tiết Kiệm
        await db.txs.add({
          type: 'transfer',
          amount,
          date: todayStr,
          fundId: sFundId,
          toFundId: sFundId,
          categoryId: null,
          note: note.trim()
            ? `Rút từ Mục tiêu "${goal.name}" → ${sFundName} (${note.trim()})`
            : `Rút từ Mục tiêu "${goal.name}" → ${sFundName}`,
          createdAt: nowTs,
          excludeFromReport: true,
          savingsGoalId: goal.id,
          savingsGoalName: goal.name,
          savingsGoalIcon: goal.icon,
          savingsAction: 'withdraw',
          savingsLogId: logId,
        })

        // 2. Nếu rút thẳng ra ví chi tiêu khác, ghi nhận thêm lệnh chuyển quỹ từ Ví Tiết Kiệm -> Ví đích
        if (withdrawTargetType === 'to_other_wallet' && toWallet?.id && toWallet.id !== sFundId) {
          await db.txs.add({
            type: 'transfer',
            amount,
            date: todayStr,
            fundId: sFundId,
            toFundId: toWallet.id,
            categoryId: null,
            note: note.trim() || `Rút từ Quỹ Tiết Kiệm (Mục tiêu "${goal.name}") về ${toWallet.name}`,
            createdAt: nowTs + 1,
            excludeFromReport: true,
          })
        }
      }

      await db.savingsGoals.put({
        ...goal,
        id: goal.id,
        allocatedAmount: nextAllocated,
        history: [...(goal.history ?? []), logItem],
      })
      onClose()
      return
    }

    // Mode === 'add'
    if (sourceType === 'other_wallet') {
      if (!activeSavingsFund?.id || !fromWalletId || fromWalletId === activeSavingsFund.id) {
        await showAlert({
          title: 'Chưa chọn ví nguồn',
          message: 'Vui lòng chọn ví nguồn khác với Ví Tiết Kiệm.',
          tone: 'warning',
        })
        return
      }
      const fromWallet = cashFunds.find(f => f.id === fromWalletId)
      const logId = 'a-' + nowTs
      // 1. Giao dịch chuyển tiền từ Ví nguồn -> Ví Tiết Kiệm
      await db.txs.add({
        type: 'transfer',
        amount,
        date: todayStr,
        fundId: fromWalletId,
        toFundId: activeSavingsFund.id,
        categoryId: null,
        note: note.trim() || `Chuyển vào ${activeSavingsFund.name} cho mục tiêu "${goal.name}"`,
        createdAt: nowTs,
        excludeFromReport: true,
      })
      // 2. Giao dịch phân bổ từ Ví Tiết Kiệm -> Mục tiêu
      await db.txs.add({
        type: 'transfer',
        amount,
        date: todayStr,
        fundId: activeSavingsFund.id,
        toFundId: activeSavingsFund.id,
        categoryId: null,
        note: note.trim()
          ? `Phân bổ từ ${activeSavingsFund.name} → Mục tiêu "${goal.name}" (${note.trim()})`
          : `Phân bổ từ ${activeSavingsFund.name} → Mục tiêu "${goal.name}"`,
        createdAt: nowTs + 1,
        excludeFromReport: true,
        savingsGoalId: goal.id,
        savingsGoalName: goal.name,
        savingsGoalIcon: goal.icon,
        savingsAction: 'allocate',
        savingsLogId: logId,
      })
      const logItem: SavingsAllocationLog = {
        id: logId,
        date: todayStr,
        amount,
        fromFundId: fromWallet?.id ?? null,
        note: note.trim() || `Trích từ ${fromWallet?.name ?? 'ví khác'} phân bổ vào "${goal.name}"`,
      }
      await db.savingsGoals.put({
        ...goal,
        id: goal.id,
        allocatedAmount: (goal.allocatedAmount || 0) + amount,
        savingsFundId: activeSavingsFund.id,
        history: [...(goal.history ?? []), logItem],
      })
      onClose()
      return
    }

    // Phân bổ từ số dư chưa phân bổ của Quỹ Tiết Kiệm
    const logId = 'a-' + nowTs
    if (sFundId) {
      await db.txs.add({
        type: 'transfer',
        amount,
        date: todayStr,
        fundId: sFundId,
        toFundId: sFundId,
        categoryId: null,
        note: note.trim()
          ? `Phân bổ từ ${sFundName} → Mục tiêu "${goal.name}" (${note.trim()})`
          : `Phân bổ từ ${sFundName} → Mục tiêu "${goal.name}"`,
        createdAt: nowTs,
        excludeFromReport: true,
        savingsGoalId: goal.id,
        savingsGoalName: goal.name,
        savingsGoalIcon: goal.icon,
        savingsAction: 'allocate',
        savingsLogId: logId,
      })
    }
    const logItem: SavingsAllocationLog = {
      id: logId,
      date: todayStr,
      amount,
      note: note.trim() || `Phân bổ từ ${sFundName}`,
    }
    await db.savingsGoals.put({
      ...goal,
      id: goal.id,
      allocatedAmount: (goal.allocatedAmount || 0) + amount,
      history: [...(goal.history ?? []), logItem],
    })
    onClose()
  }

  return (
    <div className="sheetbg" style={{ zIndex: 90 }} onClick={onClose}>
      <form
        className="sheet"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="ledger-topbar" style={{ marginBottom: 12 }}>
          <button type="button" className="close-pill-btn" onClick={onClose}>
            Huỷ
          </button>
          <b style={{ fontSize: 16 }}>
            {mode === 'add' ? `➕ Phân bổ: ${goal.name}` : `➖ Rút bớt: ${goal.name}`}
          </b>
          <button type="submit" className="close-pill-btn" style={{ color: 'var(--acc)' }}>
            Xong
          </button>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--bg)',
            border: '1px solid var(--bd)',
            fontSize: 12.5,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
            <span className="mut">Hiện có trong kế hoạch:</span>
            <b>
              {money(goal.allocatedAmount)} / {money(goal.targetAmount)} ({info.progressPct}%)
            </b>
          </div>
          {!info.isCompleted && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
              <span className="mut">Định mức cần tích lũy tháng này:</span>
              <b className="inc">{money(info.monthlyNeededNow)}</b>
            </div>
          )}
        </div>

        {mode === 'add' ? (
          <>
            <div className="seg">
              <button
                type="button"
                className={sourceType === 'unallocated' ? 'on' : ''}
                onClick={() => setSourceType('unallocated')}
              >
                🐷 Số dư rỗi ({money(unallocatedBalance)})
              </button>
              {otherWallets.length > 0 && (
                <button
                  type="button"
                  className={sourceType === 'other_wallet' ? 'on' : ''}
                  onClick={() => setSourceType('other_wallet')}
                >
                  📥 Trích từ ví khác
                </button>
              )}
            </div>

            {sourceType === 'other_wallet' && (
              <div className="fld">
                <span>Chọn ví nguồn để chuyển sang {activeSavingsFund?.name ?? 'Quỹ Tiết Kiệm'}</span>
                <InAppSelect<number>
                  title="Chọn ví nguồn trích tiền"
                  value={fromWalletId}
                  options={otherWallets.map(w => ({
                    value: w.id!,
                    label: w.name,
                    subLabel: `Số dư: ${money(balanceOfFund(w))}`,
                    rightText: money(balanceOfFund(w)),
                    rightClassName: balanceOfFund(w) < 0 ? 'exp' : 'inc',
                    icon: w.icon,
                    color: w.color,
                  }))}
                  onChange={v => setFromWalletId(Number(v))}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="seg">
              <button
                type="button"
                className={withdrawTargetType === 'to_savings' ? 'on' : ''}
                onClick={() => setWithdrawTargetType('to_savings')}
              >
                🐷 Về số dư rỗi ({activeSavingsFund?.name ?? 'Quỹ Tiết Kiệm'})
              </button>
              {otherWallets.length > 0 && (
                <button
                  type="button"
                  className={withdrawTargetType === 'to_other_wallet' ? 'on' : ''}
                  onClick={() => setWithdrawTargetType('to_other_wallet')}
                >
                  📤 Rút ra ví khác
                </button>
              )}
            </div>

            {withdrawTargetType === 'to_other_wallet' && (
              <div className="fld">
                <span>Chọn ví nhận tiền rút từ mục tiêu</span>
                <InAppSelect<number>
                  title="Chọn ví nhận tiền"
                  value={fromWalletId}
                  options={otherWallets.map(w => ({
                    value: w.id!,
                    label: w.name,
                    subLabel: `Số dư hiện tại: ${money(balanceOfFund(w))}`,
                    rightText: money(balanceOfFund(w)),
                    rightClassName: balanceOfFund(w) < 0 ? 'exp' : 'inc',
                    icon: w.icon,
                    color: w.color,
                  }))}
                  onChange={v => setFromWalletId(Number(v))}
                />
              </div>
            )}
          </>
        )}

        <div className="fld" style={{ marginBottom: 6 }}>
          <span>Số tiền {mode === 'add' ? 'phân bổ' : 'rút bớt'} (₫)</span>
          <NumericInputBox
            value={amountRaw}
            onChange={setAmountRaw}
            placeholder="Nhập số tiền..."
            suffix="₫"
            suggestions={[200000, 500000, 1000000, 2000000, 5000000]}
            variant="box"
          />
        </div>

        {/* Chip chọn nhanh */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {mode === 'add' ? (
            <>
              {info.monthlyNeededNow > 0 && (
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 99 }}
                  onClick={() => setAmountRaw(formatNumberInput(String(info.monthlyNeededNow)))}
                >
                  Định mức tháng ({money(info.monthlyNeededNow)})
                </button>
              )}
              {info.remainingAmount > 0 && (
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 99 }}
                  onClick={() => setAmountRaw(formatNumberInput(String(info.remainingAmount)))}
                >
                  Đủ 100% ({money(info.remainingAmount)})
                </button>
              )}
              {sourceType === 'unallocated' && unallocatedBalance > 0 && (
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 99 }}
                  onClick={() => setAmountRaw(formatNumberInput(String(unallocatedBalance)))}
                >
                  Tất cả số dư rỗi ({money(unallocatedBalance)})
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className="btn"
              style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 99 }}
              onClick={() => setAmountRaw(formatNumberInput(String(goal.allocatedAmount)))}
            >
              Rút toàn bộ ({money(goal.allocatedAmount)})
            </button>
          )}
        </div>

        <label className="fld">
          <span>Ghi chú (tuỳ chọn)</span>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="VD: Trích tiết kiệm tháng 11..."
          />
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>
            Huỷ
          </button>
          <button type="submit" className="btn pri" style={{ flex: 1 }}>
            {mode === 'add' ? 'Xác nhận phân bổ' : 'Xác nhận rút'}
          </button>
        </div>
      </form>
    </div>
  )
}

function DepositToSavingsModal({
  cashFunds,
  activeSavingsFund,
  goals,
  balanceOfFund,
  onClose,
}: {
  cashFunds: Fund[]
  activeSavingsFund?: Fund
  goals: SavingsGoal[]
  balanceOfFund: (f: Fund | undefined) => number
  onClose: () => void
}) {
  const otherWallets = cashFunds.filter(f => f.id !== activeSavingsFund?.id)
  const [fromWalletId, setFromWalletId] = useState<number>(otherWallets[0]?.id ?? 0)
  const [targetGoalId, setTargetGoalId] = useState<number>(0) // 0 = để ở số dư chưa phân bổ
  const [amountRaw, setAmountRaw] = useState('')
  const [note, setNote] = useState('')

  const amount = parseNumberInput(amountRaw)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSavingsFund?.id) {
      await showAlert({
        title: 'Chưa có Ví Tiết Kiệm',
        message: 'Vui lòng tạo hoặc chọn một Ví Tiết Kiệm trước khi nạp tiền.',
        tone: 'warning',
      })
      return
    }
    if (!fromWalletId || fromWalletId === activeSavingsFund.id) {
      await showAlert({
        title: 'Chưa chọn ví nguồn',
        message: 'Vui lòng chọn một ví nguồn khác để chuyển tiền sang Quỹ Tiết Kiệm.',
        tone: 'warning',
      })
      return
    }
    if (amount <= 0) {
      await showAlert({
        title: 'Số tiền chưa hợp lệ',
        message: 'Vui lòng nhập số tiền lớn hơn 0 ₫.',
        tone: 'warning',
      })
      return
    }

    const fromWallet = cashFunds.find(f => f.id === fromWalletId)
    const chosenGoal = goals.find(g => g.id === targetGoalId)
    const todayStr = ymd(new Date())
    const nowTs = Date.now()

    await db.txs.add({
      type: 'transfer',
      amount,
      date: todayStr,
      fundId: fromWalletId,
      toFundId: activeSavingsFund.id,
      categoryId: null,
      note:
        note.trim() ||
        (chosenGoal
          ? `Nạp tiết kiệm cho kế hoạch "${chosenGoal.name}"`
          : `Nạp tiền vào ${activeSavingsFund.name}`),
      createdAt: nowTs,
      excludeFromReport: true,
    })

    if (chosenGoal?.id) {
      const logId = 'dep-' + nowTs
      await db.txs.add({
        type: 'transfer',
        amount,
        date: todayStr,
        fundId: activeSavingsFund.id,
        toFundId: activeSavingsFund.id,
        categoryId: null,
        note: note.trim()
          ? `Phân bổ từ ${activeSavingsFund.name} → Mục tiêu "${chosenGoal.name}" (${note.trim()})`
          : `Phân bổ từ ${activeSavingsFund.name} → Mục tiêu "${chosenGoal.name}"`,
        createdAt: nowTs + 1,
        excludeFromReport: true,
        savingsGoalId: chosenGoal.id,
        savingsGoalName: chosenGoal.name,
        savingsGoalIcon: chosenGoal.icon,
        savingsAction: 'allocate',
        savingsLogId: logId,
      })

      const logItem: SavingsAllocationLog = {
        id: logId,
        date: todayStr,
        amount,
        fromFundId: fromWallet?.id ?? null,
        note: note.trim() || `Nạp từ ${fromWallet?.name ?? 'ví khác'}`,
      }
      await db.savingsGoals.put({
        ...chosenGoal,
        id: chosenGoal.id,
        allocatedAmount: (chosenGoal.allocatedAmount || 0) + amount,
        savingsFundId: activeSavingsFund.id,
        history: [...(chosenGoal.history ?? []), logItem],
      })
    }

    onClose()
  }

  return (
    <div className="sheetbg" style={{ zIndex: 90 }} onClick={onClose}>
      <form
        className="sheet"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="ledger-topbar" style={{ marginBottom: 12 }}>
          <button type="button" className="close-pill-btn" onClick={onClose}>
            Huỷ
          </button>
          <b style={{ fontSize: 16 }}>📥 Nạp vào Quỹ Tiết Kiệm</b>
          {otherWallets.length > 0 ? (
            <button type="submit" className="close-pill-btn" style={{ color: 'var(--acc)' }}>
              Nạp
            </button>
          ) : (
            <span style={{ width: 48 }} />
          )}
        </div>

        <p className="mut" style={{ fontSize: 12.5, marginBottom: 12 }}>
          Trích tiền từ các quỹ ví khác chuyển vào <b>{activeSavingsFund?.name ?? 'Ví Tiết Kiệm'}</b> và phân bổ cho kế hoạch.
        </p>

        {otherWallets.length === 0 ? (
          <div className="empty" style={{ padding: '14px 0' }}>
            Bạn cần có ít nhất 2 ví tiền mặt để chuyển khoản sang Ví Tiết Kiệm.
          </div>
        ) : (
          <>
            <div className="fld">
              <span>Trích tiền từ ví nào?</span>
              <InAppSelect<number>
                title="Chọn ví nguồn trích tiền"
                value={fromWalletId}
                options={otherWallets.map(w => ({
                  value: w.id!,
                  label: w.name,
                  subLabel: `Số dư: ${money(balanceOfFund(w))}`,
                  rightText: money(balanceOfFund(w)),
                  rightClassName: balanceOfFund(w) < 0 ? 'exp' : 'inc',
                  icon: w.icon,
                  color: w.color,
                }))}
                onChange={v => setFromWalletId(Number(v))}
              />
            </div>

            <div className="fld" style={{ marginBottom: 6 }}>
              <span>Số tiền chuyển vào Quỹ Tiết Kiệm (₫)</span>
              <NumericInputBox
                value={amountRaw}
                onChange={setAmountRaw}
                placeholder="VD: 2,000,000"
                suffix="₫"
                suggestions={[500000, 1000000, 2000000, 3000000, 5000000]}
                variant="box"
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {[500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000].map(v => (
                <button
                  key={v}
                  type="button"
                  className="btn"
                  style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 99 }}
                  onClick={() => setAmountRaw(formatNumberInput(String(v)))}
                >
                  {v >= 1_000_000 ? `${v / 1_000_000}tr` : '500k'}
                </button>
              ))}
            </div>

            <div className="fld">
              <span>Phân bổ ngay vào kế hoạch nào?</span>
              <InAppSelect<number>
                title="Chọn kế hoạch phân bổ"
                value={targetGoalId}
                options={[
                  {
                    value: 0,
                    label: 'Để trong Số dư chưa phân bổ của Quỹ Tiết Kiệm',
                    subLabel: 'Chưa gán cho mục tiêu cụ thể nào',
                    icon: '🐷',
                    color: '#10b981',
                  },
                  ...goals
                    .filter(g => g.id != null)
                    .map(g => ({
                      value: g.id!,
                      label: g.name,
                      subLabel: `Đã có ${money(g.allocatedAmount)} / ${money(g.targetAmount)}`,
                      icon: g.icon,
                      color: g.color,
                    })),
                ]}
                onChange={v => setTargetGoalId(Number(v))}
              />
            </div>

            <label className="fld">
              <span>Ghi chú (tuỳ chọn)</span>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="VD: Trích lương tháng 11 tiết kiệm..."
              />
            </label>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={onClose}>
            Đóng
          </button>
          {otherWallets.length > 0 && (
            <button type="submit" className="btn pri" style={{ flex: 1 }}>
              Xác nhận nạp
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
