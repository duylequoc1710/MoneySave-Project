import { createPortal } from 'react-dom'
import { money } from '../lib.ts'
import type { SmartInsightsResult } from '../smartInsights.ts'

interface SmartInsightsModalProps {
  insights: SmartInsightsResult
  onClose: () => void
  onQuickBudget: (categoryId: number, suggestedLimit: number) => void
  onQuickTransferSaving: (amount: number) => void
  onOpenExpenseReport: () => void
}

export default function SmartInsightsModal({
  insights,
  onClose,
  onQuickBudget,
  onQuickTransferSaving,
  onOpenExpenseReport,
}: SmartInsightsModalProps) {
  const { burnRate, anomalies, temporal, opportunityCost, topCat } = insights
  const maxWeekdayAvg = Math.max(
    ...temporal.weekdayStats.map(s => s.avgAmount),
    1,
  )

  const paceColor =
    burnRate.paceStatus === 'overpace'
      ? 'var(--exp)'
      : burnRate.paceStatus === 'watch'
        ? '#f59e0b'
        : 'var(--inc)'

  return createPortal(
    <div className="period-report-overlay" style={{ zIndex: 55 }}>
      <div className="period-report-shell">
        {/* Topbar */}
        <div className="ledger-topbar" style={{ marginBottom: 14 }}>
          <button type="button" className="close-pill-btn" onClick={onClose}>
            Đóng
          </button>
          <div style={{ textAlign: 'center' }}>
            <b style={{ fontSize: 17 }}>🧠 Smart Insights</b>
            <div className="mut" style={{ fontSize: 11.5 }}>
              Kỳ phân tích: {insights.monthStr} · Hôm nay {insights.todayStr}
            </div>
          </div>
          <button
            type="button"
            className="close-pill-btn"
            onClick={() => {
              onClose()
              onOpenExpenseReport()
            }}
            style={{ fontSize: 12.5, padding: '6px 12px' }}
          >
            Báo cáo chi
          </button>
        </div>

        {/* TRỤ CỘT 1: DỰ BÁO DÒNG TIỀN & TỐC ĐỘ ĐỐT TIỀN */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 19 }}>
                {burnRate.paceStatus === 'overpace'
                  ? '🔥'
                  : burnRate.paceStatus === 'watch'
                    ? '⏳'
                    : '🧭'}
              </span>
              <b>1. Dự báo dòng tiền & Tốc độ chi</b>
            </div>
            <span
              className="pill-tag"
              style={{
                color: paceColor,
                borderColor: `${paceColor}44`,
                background: `${paceColor}18`,
                fontWeight: 700,
              }}
            >
              {burnRate.paceStatus === 'overpace'
                ? 'Nhanh hơn nhịp'
                : burnRate.paceStatus === 'watch'
                  ? 'Sát ngưỡng'
                  : ' Nhịp an toàn'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div className="group-stat-box" style={{ cursor: 'default' }}>
              <div>
                <div className="mut" style={{ fontSize: 12 }}>
                  Đã chi ({burnRate.elapsedDays}/{burnRate.daysInMonth} ngày)
                </div>
                <b className="exp" style={{ fontSize: 17 }}>
                  {money(burnRate.thisMonthExpense)}
                </b>
              </div>
            </div>
            <div className="group-stat-box" style={{ cursor: 'default' }}>
              <div>
                <div className="mut" style={{ fontSize: 12 }}>
                  Dự báo chốt tháng {insights.monthStr}
                </div>
                <b style={{ fontSize: 17, color: paceColor }}>
                  ~{money(burnRate.projectedMonthExpense)}
                </b>
              </div>
            </div>
          </div>

          {/* Dual-Pace Sparkbar */}
          <div
            style={{
              background: 'color-mix(in srgb, var(--fg) 5%, transparent)',
              borderRadius: 12,
              padding: '10px 12px',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <span className="mut">
                Tốc độ chi: <b style={{ color: paceColor }}>{burnRate.spendProgressPct}%</b>
              </span>
              <span className="mut">
                Thời gian trôi qua: <b>{burnRate.timeProgressPct}%</b> (Ngày{' '}
                {burnRate.elapsedDays}/{burnRate.daysInMonth})
              </span>
            </div>
            <div
              style={{
                position: 'relative',
                height: 10,
                background: 'var(--bd)',
                borderRadius: 99,
                overflow: 'visible',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, burnRate.spendProgressPct)}%`,
                  height: '100%',
                  background: paceColor,
                  borderRadius: 99,
                  transition: 'width 0.25s ease',
                }}
              />
              {/* Vạch đánh dấu tiến độ thời gian */}
              <div
                title={`Tiến độ thời gian: ${burnRate.timeProgressPct}%`}
                style={{
                  position: 'absolute',
                  left: `${Math.min(98, Math.max(2, burnRate.timeProgressPct))}%`,
                  top: -3,
                  bottom: -3,
                  width: 3,
                  borderRadius: 2,
                  background: 'var(--fg)',
                  boxShadow: '0 0 4px #0008',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11.5,
                marginTop: 6,
              }}
              className="mut"
            >
              <span>
                Nhịp đốt tiền điều chỉnh: <b>{money(burnRate.weightedDailyBurn)}/ngày</b>
              </span>
              <span>
                TB 3 tháng trước: <b>{money(burnRate.baselineExpense)}</b>
              </span>
            </div>
          </div>

          <p style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 10 }}>
            {burnRate.copy}
          </p>

          {topCat.id > 0 && (
            <button
              type="button"
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center', borderRadius: 12 }}
              onClick={() => onQuickBudget(topCat.id, topCat.suggestedLimit)}
            >
              🎯 Đặt trần kiểm soát "{topCat.name}" ({money(topCat.suggestedLimit)})
            </button>
          )}
        </div>

        {/* TRỤ CỘT 2: PHÁT HIỆN BẤT THƯỜNG & RÒ RỈ VI MÔ */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 19 }}>🔍</span>
              <b>2. Phát hiện bất thường & Rò rỉ vi mô</b>
            </div>
          </div>

          <p className="mut" style={{ fontSize: 13, marginBottom: 12 }}>
            {anomalies.summaryCopy}
          </p>

          {anomalies.spikes.map(sp => (
            <div
              key={`sp-${sp.categoryId}`}
              style={{
                border: '1px solid rgba(242, 85, 81, 0.35)',
                background: 'rgba(242, 85, 81, 0.08)',
                borderRadius: 14,
                padding: '12px 14px',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <b>
                  {sp.categoryIcon} {sp.headline}
                </b>
                <span
                  className="pill-tag"
                  style={{ color: 'var(--exp)', fontWeight: 700 }}
                >
                  Đột biến {sp.multiplier}x
                </span>
              </div>
              <div
                style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}
              >
                {sp.detailCopy}
              </div>
              <button
                type="button"
                className="btn ghost"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  borderColor: 'var(--exp)',
                  color: 'var(--exp)',
                  fontSize: 12.5,
                  padding: '8px 12px',
                  borderRadius: 10,
                }}
                onClick={() => onQuickBudget(sp.categoryId, sp.suggestedLimit)}
              >
                🔒 Khóa hạn mức tháng cho {sp.categoryName} ({money(sp.suggestedLimit)})
              </button>
            </div>
          ))}

          {anomalies.microLeaks.slice(0, 3).map(ml => (
            <div
              key={`ml-${ml.categoryId}`}
              style={{
                border: '1px solid var(--bd)',
                background: 'color-mix(in srgb, var(--fg) 4%, transparent)',
                borderRadius: 14,
                padding: '12px 14px',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <b>
                  {ml.categoryIcon} {ml.headline}
                </b>
                <span className="pill-tag" style={{ color: '#f59e0b' }}>
                  ~{ml.workHoursEquivalent}h làm việc
                </span>
              </div>
              <div
                className="mut"
                style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 10 }}
              >
                {ml.detailCopy}
              </div>
              <button
                type="button"
                className="btn ghost"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: 12.5,
                  padding: '8px 12px',
                  borderRadius: 10,
                }}
                onClick={() => onQuickBudget(ml.categoryId, ml.suggestedLimit)}
              >
                {ml.currentLimit
                  ? `🎯 Điều chỉnh trần ${ml.categoryName} (Đang đặt: ${money(ml.currentLimit)})`
                  : `🔒 Đặt trần hạn mức ${money(ml.suggestedLimit)} cho ${ml.categoryName}`}
              </button>
            </div>
          ))}

          {anomalies.spikes.length === 0 && anomalies.microLeaks.length === 0 && (
            <div
              style={{
                padding: '14px',
                borderRadius: 12,
                background: 'rgba(40, 199, 111, 0.08)',
                color: 'var(--inc)',
                fontSize: 13.5,
                fontWeight: 500,
              }}
            >
              ✅ Dòng tiền rất gọn gàng! Không phát hiện khoản chi nhỏ lẻ tích lũy bất thường.
            </div>
          )}
        </div>

        {/* TRỤ CỘT 3: NHỊP SINH HỌC TÀI CHÍNH THEO CHU KỲ */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 19 }}>🌴</span>
              <b>3. Nhịp sinh học tài chính theo chu kỳ</b>
            </div>
            <span className="pill-tag">
              Cao điểm: {temporal.peakDayLabel}
            </span>
          </div>

          <p style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>
            {temporal.weekendCopy}
          </p>

          {/* Biểu đồ cột mini Thứ 2 -> Chủ Nhật */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              alignItems: 'end',
              height: 110,
              padding: '12px 8px 6px',
              background: 'color-mix(in srgb, var(--fg) 4%, transparent)',
              borderRadius: 14,
              marginBottom: 12,
            }}
          >
            {temporal.weekdayStats.map(st => {
              const barPct = Math.max(
                8,
                Math.round((st.avgAmount / maxWeekdayAvg) * 100),
              )
              const barColor = st.isWeekend ? '#f59e0b' : 'var(--acc)'
              return (
                <div
                  key={st.shortLabel}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    title={`${st.fullLabel}: TB ${money(st.avgAmount)}`}
                    style={{
                      width: '100%',
                      maxWidth: 28,
                      height: `${barPct}%`,
                      background: barColor,
                      borderRadius: '6px 6px 3px 3px',
                      opacity: st.avgAmount > 0 ? 0.92 : 0.25,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: st.isWeekend ? 700 : 500,
                      color: st.isWeekend ? '#f59e0b' : 'var(--mut)',
                      marginTop: 5,
                    }}
                  >
                    {st.shortLabel}
                  </span>
                </div>
              )
            })}
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              background: 'color-mix(in srgb, var(--fg) 5%, transparent)',
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            <b>💸 Chu kỳ sau ngày nhận thu nhập:</b>{' '}
            <span className="mut">{temporal.paydayCopy}</span>
          </div>
        </div>

        {/* TRỤ CỘT 4: CHI PHÍ CƠ HỘI & CAN THIỆP 1-CHẠM */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 19 }}>🌱</span>
              <b>4. Chi phí cơ hội & Tích lũy lãi kép</b>
            </div>
            <span className="pill-tag" style={{ color: 'var(--acc)' }}>
              1h làm ≈ {money(opportunityCost.hourlyWage)}
            </span>
          </div>

          <p style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 12 }}>
            {opportunityCost.copy}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div className="group-stat-box" style={{ cursor: 'default' }}>
              <div>
                <div className="mut" style={{ fontSize: 12 }}>
                  Tích lũy sau 1 năm (6.5%/năm)
                </div>
                <b className="inc" style={{ fontSize: 16.5 }}>
                  {money(opportunityCost.compound1YearValue)}
                </b>
              </div>
            </div>
            <div className="group-stat-box" style={{ cursor: 'default' }}>
              <div>
                <div className="mut" style={{ fontSize: 12 }}>
                  Tích lũy sau 3 năm (6.5%/năm)
                </div>
                <b className="inc" style={{ fontSize: 16.5 }}>
                  {money(opportunityCost.compound3YearValue)}
                </b>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              borderRadius: 12,
              padding: '12px 16px',
              fontWeight: 700,
            }}
            onClick={() => {
              onClose()
              onQuickTransferSaving(opportunityCost.potentialMonthlySaving)
            }}
          >
            💸 Cất ngay {money(opportunityCost.potentialMonthlySaving)} sang{' '}
            {opportunityCost.savingFundName}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
