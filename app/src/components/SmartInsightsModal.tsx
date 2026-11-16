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

const statBox = (label: string, value: string, cls?: string, color?: string) => (
  <div className="group-stat-box" style={{ cursor: 'default' }}>
    <div>
      <div className="mut" style={{ fontSize: 12 }}>
        {label}
      </div>
      <b className={cls} style={{ fontSize: 17, color }}>
        {value}
      </b>
    </div>
  </div>
)

const softBox = { padding: '12px 14px', borderRadius: 12, background: 'color-mix(in srgb, var(--fg) 5%, transparent)', fontSize: 14 }

export default function SmartInsightsModal({
  insights,
  onClose,
  onQuickBudget,
  onQuickTransferSaving,
  onOpenExpenseReport,
}: SmartInsightsModalProps) {
  const { forecast, rises, net, weekly, topCat, hasHistory } = insights
  const maxWeekdayAvg = Math.max(...weekly.weekdayStats.map(s => s.avgAmount), 1)
  const paceColor =
    !hasHistory ? 'var(--info)' : forecast.paceStatus === 'overpace' ? 'var(--exp)' : forecast.paceStatus === 'watch' ? 'var(--warn)' : 'var(--inc)'

  return createPortal(
    <div className="period-report-overlay" style={{ zIndex: 55 }}>
      <div className="period-report-shell">
        <div className="ledger-topbar" style={{ marginBottom: 14 }}>
          <button type="button" className="close-pill-btn" onClick={onClose}>
            Đóng
          </button>
          <div style={{ textAlign: 'center' }}>
            <b style={{ fontSize: 17 }}>🧠 Smart Insights</b>
            <div className="mut" style={{ fontSize: 12 }}>
              Tháng {insights.monthStr} · Hôm nay {insights.todayStr}
            </div>
          </div>
          <button
            type="button"
            className="close-pill-btn"
            onClick={() => {
              onClose()
              onOpenExpenseReport()
            }}
            style={{ fontSize: 13, padding: '6px 12px' }}
          >
            Báo cáo chi
          </button>
        </div>

        {/* 1. Dự báo cuối tháng */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 8 }}>
            <b>🧭 1. Dự báo cuối tháng</b>
            <span className="pill-tag" style={{ color: paceColor, fontWeight: 700 }}>
              {!hasHistory ? 'Chưa đủ dữ liệu' : forecast.paceStatus === 'overpace' ? 'Cao hơn thường lệ' : forecast.paceStatus === 'watch' ? 'Hơi cao' : 'Bình thường'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {statBox(`Đã chi (${forecast.elapsedDays}/${forecast.daysInMonth} ngày)`, money(forecast.thisMonthExpense), 'exp')}
            {statBox('Dự kiến cả tháng', `~${money(forecast.projectedMonthExpense)}`, undefined, paceColor)}
          </div>
          {hasHistory && (
            <div style={{ ...softBox, marginBottom: 10 }}>
              <div className="mut" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, gap: 8 }}>
                <span>
                  Đã chi: <b style={{ color: paceColor }}>{forecast.spendProgressPct}%</b> mức TB tháng
                </span>
                <span>
                  Cùng kỳ thường lệ: <b>{forecast.usualProgressPct}%</b>
                </span>
              </div>
              <div className="sparkbar-track" style={{ height: 10 }}>
                <div
                  className="sparkbar-fill"
                  style={{ width: `${forecast.spendProgressPct > 0 ? Math.min(100, Math.max(4, forecast.spendProgressPct)) : 0}%`, background: paceColor }}
                />
                <div
                  title={`Thường lệ đến hôm nay: ${forecast.usualProgressPct}%`}
                  style={{
                    position: 'absolute',
                    left: `${Math.min(98, Math.max(2, forecast.usualProgressPct))}%`,
                    top: -3,
                    bottom: -3,
                    width: 3,
                    borderRadius: 2,
                    background: 'var(--fg)',
                  }}
                />
              </div>
              <div className="mut" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, gap: 8 }}>
                <span>
                  Chi hằng ngày: <b>{money(forecast.dailyRate)}/ngày</b>
                </span>
                <span>
                  TB 3 tháng trước: <b>{money(forecast.baselineExpense)}</b>
                </span>
              </div>
            </div>
          )}
          <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 6 }}>{forecast.copy}</p>
          {forecast.expectedLargeRemaining > 0 && (
            <p className="mut" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 10 }}>
              Dự kiến đã tính thêm {money(forecast.expectedLargeRemaining)} khoản lớn thường có mỗi tháng nhưng tháng này chưa phát sinh.
            </p>
          )}
          {topCat.id > 0 && (
            <button
              type="button"
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center', borderRadius: 12 }}
              onClick={() => onQuickBudget(topCat.id, topCat.suggestedLimit)}
            >
              🎯 {topCat.currentLimit ? 'Sửa' : 'Đặt'} hạn mức "{topCat.name}" – nhóm chi nhiều nhất ({money(topCat.amount)})
            </button>
          )}
        </div>

        {/* 2. Nhóm chi tăng so với cùng kỳ */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 8 }}>
            <b>📈 2. Nhóm chi tăng so với cùng kỳ</b>
          </div>
          <p className="mut" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.45 }}>
            So chi hằng ngày (không tính khoản từ {money(forecast.largeThreshold)}) từ đầu tháng đến hôm nay với cùng kỳ các tháng trước.
          </p>
          {rises.map(r => (
            <div key={r.categoryId} style={{ border: '1px solid var(--bd)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <b>
                  {r.categoryIcon} {r.categoryName}
                </b>
                <span className="pill-tag" style={{ color: 'var(--warn)', fontWeight: 700 }}>
                  +{r.risePct}%
                </span>
              </div>
              <div className="mut" style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 10 }}>
                Đã chi {money(r.currentAmount)} · cùng kỳ thường lệ {money(r.usualAmount)} · cao hơn {money(r.extraAmount)}
              </div>
              <button
                type="button"
                className="btn"
                style={{ width: '100%', justifyContent: 'center', fontSize: 14, borderRadius: 10 }}
                onClick={() => onQuickBudget(r.categoryId, r.suggestedLimit)}
              >
                🎯 Hạn mức tháng cho {r.categoryName}
              </button>
            </div>
          ))}
          {rises.length === 0 && (
            <div style={softBox}>
              {!hasHistory
                ? 'Cần ít nhất 1 tháng dữ liệu trước để so sánh.'
                : forecast.elapsedDays < 5
                  ? 'Từ ngày 05 trở đi sẽ so sánh (đầu tháng ít dữ liệu, dễ báo sai).'
                  : '✅ Không có nhóm nào chi cao bất thường so với cùng kỳ.'}
            </div>
          )}
        </div>

        {/* 3. Thu – chi tháng này */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 8 }}>
            <b>🌱 3. Thu – chi tháng này</b>
          </div>
          {net.hasIncome && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {statBox('Hiện còn', money(net.netSoFar), net.netSoFar >= 0 ? 'inc' : 'exp')}
              {statBox('Dự kiến cuối tháng', money(net.projectedNet), net.projectedNet >= 0 ? 'inc' : 'exp')}
            </div>
          )}
          <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: net.suggestedSaving > 0 ? 12 : 0 }}>{net.copy}</p>
          {net.suggestedSaving > 0 && (
            <button
              type="button"
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center', borderRadius: 12 }}
              onClick={() => {
                onClose()
                onQuickTransferSaving(net.suggestedSaving)
              }}
            >
              💸 Chuyển {money(net.suggestedSaving)} vào {net.savingFundName}
            </button>
          )}
        </div>

        {/* 4. Nhịp chi trong tuần */}
        <div className="card">
          <div className="card-head" style={{ marginBottom: 8 }}>
            <b>📅 4. Nhịp chi trong tuần</b>
            <span className="pill-tag">Nhiều nhất: {weekly.peakDayLabel}</span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>{weekly.copy}</p>
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
            }}
          >
            {weekly.weekdayStats.map(st => (
              <div key={st.shortLabel} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div
                  title={`${st.fullLabel}: TB ${money(st.avgAmount)}/ngày`}
                  style={{
                    width: '100%',
                    maxWidth: 28,
                    height: `${Math.max(8, Math.round((st.avgAmount / maxWeekdayAvg) * 100))}%`,
                    background: st.avgAmount > 0 ? (st.isWeekend ? 'var(--warn)' : 'var(--acc)') : 'var(--bar-track)',
                    border: st.avgAmount > 0 ? 'none' : '1px solid var(--bar-bd)',
                    borderRadius: '6px 6px 3px 3px',
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: st.isWeekend ? 700 : 500, color: st.isWeekend ? 'var(--warn)' : 'var(--mut)', marginTop: 5 }}>
                  {st.shortLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
