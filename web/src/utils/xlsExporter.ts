import type { TripRecord } from '@/types/trip'
import { vehicleLabel } from '@/types/expense'
import { formatMoney, formatNum } from './numeric'

export const DEFAULT_COMPANY = '公司'
export const TRIP_HEADERS = ['日期', '单位', '目的地', '事由', '距离(km)', '金额(元)', '车型'] as const
const NUMERIC = new Set(['距离(km)', '金额(元)'])

export function tripSheetTitle(month: number): string {
  return `私车公用${month}月里程统计汇总`
}

function purposeOrDefault(purpose: string): string {
  return purpose && purpose.trim() ? purpose : DEFAULT_COMPANY
}

export function sortTrips(trips: TripRecord[]): TripRecord[] {
  return [...trips].filter((t) => !t.isDeleted).sort((a, b) => a.date.localeCompare(b.date))
}

export function tripTableRows(trips: TripRecord[], month: number): string[][] {
  const sorted = sortTrips(trips)
  const rows: string[][] = [[tripSheetTitle(month), '', '', '', '', '', '']]
  for (const t of sorted) {
    rows.push([
      t.date,
      DEFAULT_COMPANY,
      t.destination,
      purposeOrDefault(t.purpose),
      formatNum(t.distance),
      formatMoney(t.amount),
      vehicleLabel(t.vehicleType),
    ])
  }
  const totalKm = sorted.reduce((s, t) => s + Number(t.distance || 0), 0)
  const totalAmt = sorted.reduce((s, t) => s + Number(t.amount || 0), 0)
  rows.push([
    '合计',
    '',
    `行程 ${sorted.length} 次`,
    '',
    formatNum(totalKm),
    formatMoney(totalAmt),
    '',
  ])
  return rows
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function cell(value: string, header: string): string {
  if (NUMERIC.has(header) && value !== '' && !Number.isNaN(Number(value))) {
    return `<Cell><Data ss:Type="Number">${Number(value)}</Data></Cell>`
  }
  return `<Cell><Data ss:Type="String">${esc(value)}</Data></Cell>`
}

/** SpreadsheetML 2003 — Excel/WPS 可开 */
export function buildTripXlsXml(year: number, month: number, trips: TripRecord[]): string {
  const title = tripSheetTitle(month)
  const rows = tripTableRows(trips, month)
  const widths = [88, 64, 110, 100, 72, 80, 76]
  const sb: string[] = []
  sb.push('<?xml version="1.0"?>')
  sb.push('<?mso-application progid="Excel.Sheet"?>')
  sb.push(
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
  )
  sb.push(` <Worksheet ss:Name="行程_${year}_${String(month).padStart(2, '0')}">`)
  sb.push('  <Table>')
  TRIP_HEADERS.forEach((_, i) => sb.push(`   <Column ss:Width="${widths[i] || 90}"/>`))
  sb.push(`   <Row><Cell ss:MergeAcross="6"><Data ss:Type="String">${esc(title)}</Data></Cell></Row>`)
  sb.push(`   <Row>${TRIP_HEADERS.map((h) => cell(h, h)).join('')}</Row>`)
  for (const r of rows) {
    const first = r[0] || ''
    if (first.startsWith('私车公用')) continue
    sb.push(`   <Row>${r.map((v, i) => cell(v, TRIP_HEADERS[i] || '')).join('')}</Row>`)
  }
  sb.push('  </Table>')
  sb.push(' </Worksheet>')
  sb.push('</Workbook>')
  return sb.join('\n') + '\n'
}

export function tripFileName(year: number, month: number): string {
  return `行程统计_${year}_${String(month).padStart(2, '0')}.xls`
}

export type ShareTripResult =
  | 'shared'
  | 'saved'
  | 'downloaded'
  | 'cancelled'
  | 'failed'

/**
 * 行程 XLS 导出：
 * - Capacitor 原生：写入应用文档目录并调起系统分享（WebView 里 a.click 下载无效）
 * - 浏览器：Web Share → 否则触发下载
 */
export async function shareTripXls(xml: string, fileName: string): Promise<ShareTripResult> {
  const { Capacitor } = await import('@capacitor/core')

  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')

      // 先写缓存（路径更稳），失败再写 Documents
      let uri = ''
      const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_')
      const attempts: {
        dir: (typeof Directory)[keyof typeof Directory]
        path: string
      }[] = [
        { dir: Directory.Cache, path: `exports/${safeName}` },
        { dir: Directory.Data, path: `exports/${safeName}` },
        { dir: Directory.Documents, path: `报销神器/${safeName}` },
      ]
      for (const a of attempts) {
        try {
          const wr = await Filesystem.writeFile({
            path: a.path,
            data: xml,
            directory: a.dir,
            encoding: Encoding.UTF8,
            recursive: true,
          })
          uri = wr.uri
          break
        } catch (e) {
          console.warn('writeFile failed', a, e)
        }
      }
      if (!uri) return 'failed'

      try {
        await Share.share({
          title: fileName,
          text: '行程统计 XLS（单位默认公司）',
          url: uri,
          dialogTitle: '分享行程统计',
        })
        return 'shared'
      } catch (e) {
        if ((e as Error)?.name === 'AbortError' || String(e).includes('cancel')) {
          return 'cancelled'
        }
        console.warn('Share.share failed', e)
        return 'saved'
      }
    } catch (e) {
      console.error('native xls export failed', e)
      return 'failed'
    }
  }

  const blob = new Blob(['﻿' + xml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const file = new File([blob], fileName, { type: 'application/vnd.ms-excel' })
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean
    share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>
  }
  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName, text: '行程统计 XLS' })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
    }
  }
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}
