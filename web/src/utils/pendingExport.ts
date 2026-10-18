import type { ExpenseRecord } from '@/types/expense'
import { CATEGORY_LABEL } from '@/types/expense'
import { db } from '@/db/schema'

const HEADERS = ['序号', '内容', '数量', '单位', '项目名称', '项目编号', '事由', '记录日期']

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cell(v: string | number, numeric = false): string {
  const s = String(v ?? '')
  if (numeric && s !== '' && !Number.isNaN(Number(s))) {
    return `<Cell><Data ss:Type="Number">${Number(s)}</Data></Cell>`
  }
  return `<Cell><Data ss:Type="String">${esc(s)}</Data></Cell>`
}

/** 未报销明细 xls：按日期从低到高 */
export function buildPendingExpenseXlsXml(records: ExpenseRecord[]): string {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))
  const sb: string[] = []
  sb.push('<?xml version="1.0"?>')
  sb.push('<?mso-application progid="Excel.Sheet"?>')
  sb.push(
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
  )
  sb.push(' <Worksheet ss:Name="未报销">')
  sb.push('  <Table>')
  const widths = [48, 120, 48, 48, 140, 100, 140, 90]
  widths.forEach((w) => sb.push(`   <Column ss:Width="${w}"/>`))
  sb.push(`   <Row>${HEADERS.map((h) => cell(h)).join('')}</Row>`)
  sorted.forEach((r, i) => {
    const row = [
      cell(i + 1, true),
      cell(r.title || CATEGORY_LABEL[r.category]),
      cell(1, true),
      cell('笔'),
      cell(r.title),
      cell(r.projectCode),
      cell(r.purpose),
      cell(r.date),
    ]
    sb.push(`   <Row>${row.join('')}</Row>`)
  })
  sb.push('  </Table>')
  sb.push(' </Worksheet>')
  sb.push('</Workbook>')
  return sb.join('\n') + '\n'
}

export function sanitizeFileName(s: string): string {
  return (s || '未命名').replace(/[\\/:*?"<>|\r\n]+/g, '_').trim().slice(0, 40) || '未命名'
}

export function attachmentBaseName(r: ExpenseRecord): string {
  return sanitizeFileName(
    [r.title, r.projectCode || '无编号', r.date, String(r.amount)].filter(Boolean).join('_'),
  )
}

export type ExportPendingResult = { ok: boolean; message: string; fileName?: string; blob?: Blob }

/** 打包未报销：附件按「项目名_编号_日期_金额」命名 + 日期升序 xls */
export async function buildPendingZipBlob(records: ExpenseRecord[]): Promise<{
  blob: Blob
  fileName: string
  count: number
  fileCount: number
}> {
  const { default: JSZip } = await import('jszip')
  const pending = records.filter((r) => r.status === 'PENDING')
  if (!pending.length) {
    throw new Error('没有待报销记录')
  }
  const zip = new JSZip()
  const folder = zip.folder('未报销')!
  const sorted = [...pending].sort((a, b) => a.date.localeCompare(b.date))

  const xml = buildPendingExpenseXlsXml(sorted)
  folder.file('未报销明细.xls', xml)

  let fileCount = 0
  const used = new Set<string>()
  for (const r of sorted) {
    const base = attachmentBaseName(r)
    for (const a of r.attachments || []) {
      try {
        const row = await db.attachments.get(a.blobId)
        if (!row?.blob) continue
        const ext = a.kind === 'pdf' || row.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'jpg'
        let name = `${base}.${ext}`
        let n = 2
        while (used.has(name)) {
          name = `${base}_${n}.${ext}`
          n++
        }
        used.add(name)
        folder.file(name, row.blob)
        fileCount++
      } catch (e) {
        console.warn('attachment skip', a.blobId, e)
      }
    }
  }

  let blob: Blob
  try {
    blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  } catch {
    throw new Error('打包失败：附件可能过大或已损坏，请检查后重试')
  }
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return {
    blob,
    fileName: `未报销打包_${ymd}.zip`,
    count: sorted.length,
    fileCount,
  }
}
