import type { LucideIcon } from 'lucide-react'

/** Trạng thái trống có hướng dẫn: icon + tiêu đề + gợi ý + (tuỳ chọn) 1 nút hành động. */
export default function EmptyState({
  icon: Icon,
  title,
  hint,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="empty empty-guide">
      <Icon size={32} strokeWidth={1.6} />
      <b>{title}</b>
      {hint && <p>{hint}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn pri" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
