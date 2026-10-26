import { COLORS } from './palette'

export function Colors({ v, on }: { v: string; on: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
      {COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => on(c)}
          aria-label={c}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: c,
            border: v === c ? '3px solid var(--fg)' : '0',
            cursor: 'pointer',
          }}
        />
      ))}
    </div>
  )
}
