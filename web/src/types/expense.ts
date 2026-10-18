export type ExpenseCategory = 'MATERIAL' | 'MEAL_SUBSIDY' | 'INVOICE' | 'OTHER'
export type ExpenseStatus = 'PENDING' | 'PAID'

export interface ExpenseAttachment {
  kind: 'image' | 'pdf'
  /** IndexedDB attachments 表主键 */
  blobId: number
  name: string
}

export interface ExpenseRecord {
  id: number
  title: string
  projectCode: string
  amount: number
  purpose: string
  category: ExpenseCategory
  attachments: ExpenseAttachment[]
  status: ExpenseStatus
  date: string // YYYY-MM-DD
  createdAt: string
  updatedAt: string
}

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  MATERIAL: '材料费',
  MEAL_SUBSIDY: '加班餐补',
  INVOICE: '发票类',
  OTHER: '其他费用',
}

export function supportsPdf(category: ExpenseCategory): boolean {
  return category === 'INVOICE'
}

export function vehicleLabel(v: string): string {
  return v === 'ELECTRIC' ? '新能源' : v === 'GASOLINE' ? '油车' : v
}
