import { format, addMonths, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Tx } from './db'

export const money = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫'
export const moneyShort = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ'
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' tr'
  if (a >= 1e3) return Math.round(n / 1e3) + 'k'
  return String(Math.round(n))
}
export const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
export const monthKey = (d: Date) => format(d, 'yyyy-MM')
export const monthLabel = (d: Date) => format(d, "'Tháng' M, yyyy", { locale: vi })
export const dayLabel = (s: string) => format(parseISO(s), 'EEEE, dd/MM', { locale: vi })
export const shiftMonth = (d: Date, n: number) => addMonths(d, n)

/** Tác động của giao dịch lên số dư một quỹ */
export function effectOn(tx: Tx, fundId: number): number {
  if (tx.type === 'income') return tx.fundId === fundId ? tx.amount : 0
  if (tx.type === 'expense') return tx.fundId === fundId ? -tx.amount : 0
  return (tx.fundId === fundId ? -tx.amount : 0) + (tx.toFundId === fundId ? tx.amount : 0)
}
