// 附件保存到本地时的命名：项目名_编号_日期_金额（多附件追加序号），并清理非法字符、保留扩展名
export function attachmentSaveName(meta: {
  title: string
  projectCode: string
  date: string
  amount: number | string
  index?: number
  total?: number
  fileName?: string
  kind?: 'image' | 'pdf'
}): string {
  const clean = (s: string) => (s || '').trim().replace(/[\\/:*?"<>|\s]+/g, '_')
  const base = [
    clean(meta.title),
    clean(meta.projectCode),
    clean(meta.date),
    clean(String(meta.amount)),
  ]
    .filter(Boolean)
    .join('_')
  let name = base || (meta.fileName ? meta.fileName.replace(/\.[^.]+$/, '') : '附件')
  if ((meta.total ?? 1) > 1 && meta.index != null) name += `_${meta.index + 1}`

  let ext = ''
  if (meta.kind === 'pdf' || (meta.fileName || '').toLowerCase().endsWith('.pdf')) {
    ext = '.pdf'
  } else {
    const m = (meta.fileName || '').match(/\.([a-z0-9]+)$/i)
    ext = m ? '.' + m[1].toLowerCase() : '.png'
  }
  return name + ext
}
