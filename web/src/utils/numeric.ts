/** 最多一个小数点；去多余前导 0（保留 0.） */
export function sanitizeNumericInput(raw: string): string {
  let dots = 0
  let out = ''
  for (const c of raw) {
    if (c >= '0' && c <= '9') out += c
    else if (c === '.' && dots === 0) {
      out += c
      dots++
    }
  }
  if (out === '') return ''
  if (out === '.') return '0.'
  if (out.startsWith('0') && out.length > 1 && out[1] !== '.') {
    const trimmed = out.replace(/^0+/, '')
    return trimmed === '' || trimmed === '.' ? '0' + (out.includes('.') ? '.' : '') : trimmed
  }
  return out
}

export function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4)))
}

/** 金额列固定 2 位小数，保证 Excel/WPS 显示一致 */
export function formatMoney(n: number): string {
  const v = Number(n)
  return (Number.isFinite(v) ? v : 0).toFixed(2)
}
