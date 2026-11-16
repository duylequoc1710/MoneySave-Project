import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

// U3: thang cỡ chữ thống nhất + tương phản token màu giao diện Sáng.
const SCALE = new Set([12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 32, 34])
const src = new URL('.', import.meta.url)
const css = readFileSync(new URL('index.css', src), 'utf8')

function listTsx(dir: URL): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? listTsx(new URL(e.name + '/', dir)) : e.name.endsWith('.tsx') ? [new URL(e.name, dir)] : [],
  )
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe('U3 chữ & màu', () => {
  it('mọi cỡ chữ nằm trong thang thống nhất', () => {
    const bad: string[] = []
    for (const m of css.matchAll(/font-size:\s*([0-9.]+)px/g)) if (!SCALE.has(Number(m[1]))) bad.push(`index.css ${m[1]}`)
    for (const f of listTsx(src)) {
      const text = readFileSync(f, 'utf8')
      for (const m of text.matchAll(/fontSize:\s*'?([0-9.]+)(?:px)?'?/g))
        if (!SCALE.has(Number(m[1]))) bad.push(`${f.pathname.split('/src/')[1]} ${m[1]}`)
    }
    assert.deepEqual(bad, [])
  })

  it('token chữ giao diện Sáng đạt tương phản ≥ 4.5:1 trên nền thẻ và nền trang', () => {
    const light = css.slice(0, css.indexOf('}'))
    const tok = (name: string) => {
      const m = light.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
      assert.ok(m, `thiếu token --${name}`)
      return m[1]
    }
    for (const name of ['fg', 'mut', 'acc', 'inc', 'exp', 'warn', 'info'])
      for (const bg of ['card', 'bg'])
        assert.ok(contrast(tok(name), tok(bg)) >= 4.5, `--${name} trên --${bg}: ${contrast(tok(name), tok(bg)).toFixed(2)}`)
    // Chữ trên nút chính (nền --acc)
    assert.ok(contrast(tok('on-acc'), tok('acc')) >= 4.5)
  })

  it('giao diện Tối: chữ trên nút xanh ≥ 4.5:1', () => {
    const dark = css.slice(css.indexOf(':root[data-theme="dark"]'))
    const tok = (name: string) => dark.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))![1]
    assert.ok(contrast(tok('on-acc'), tok('acc')) >= 4.5, `--on-acc trên --acc: ${contrast(tok('on-acc'), tok('acc')).toFixed(2)}`)
  })
})
