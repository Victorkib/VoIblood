/** Shared CSV helpers for report exports. */

export function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function rowsToCsv(headers, rows) {
  const lines = [headers.map(escapeCsvValue).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvValue(row[h])).join(','))
  }
  return lines.join('\n')
}

export function withBom(csv) {
  return `\uFEFF${csv}`
}
