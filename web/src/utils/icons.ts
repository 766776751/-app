/** 内联 SVG 图标系统 — 看图标即可理解功能 */
export type IconName =
  | 'home'
  | 'car'
  | 'wallet'
  | 'settings'
  | 'plus'
  | 'share'
  | 'download'
  | 'edit'
  | 'history'
  | 'trash'
  | 'folder'
  | 'pin'
  | 'file'
  | 'search'
  | 'close'
  | 'check'
  | 'money'
  | 'gauge'
  | 'list'
  | 'pdf'
  | 'image'
  | 'export'
  | 'back'
  | 'rate'
  | 'eye'

export const ICON_PATHS: Record<IconName, string> = {
  // 首页：房子
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  // 行程：车
  car: 'M5 11l1.5-4h11L19 11M4 11h16v6H4zM7.5 17.5h.01M16.5 17.5h.01M4 14h16',
  // 报销：钱包
  wallet: 'M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 7V6a2 2 0 0 1 2-2h11M16 12h4v3h-4a1.5 1.5 0 0 1 0-3z',
  // 设置
  settings:
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6',
  plus: 'M12 5v14M5 12h14',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M8 7l4-4 4 4M12 3v12',
  download: 'M12 4v10M8 11l4 4 4-4M5 18h14',
  edit: 'M4 20h4l10-10-4-4L4 16zM13 7l4 4',
  history: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4M12 8v4l3 2',
  trash: 'M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v6M14 11v6',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  pin: 'M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  file: 'M7 3h7l4 4v14H7zM14 3v4h4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 9.5 17 19 7',
  money: 'M8 6l4 6 4-6M8 13h8M8 16h8M12 12v6',
  gauge: 'M5 18a8 8 0 1 1 14 0M12 14l3-3',
  list: 'M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01',
  pdf: 'M7 3h7l4 4v14H7zM14 3v4h4M9 14h1.5a1.5 1.5 0 0 0 0-3H9v6M13 11h2.2a1.8 1.8 0 0 1 0 3.6H13V11z',
  image: 'M4 5h16v14H4zM9 10a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM5 17l4.5-4.5 3 3L16 12l3 3',
  export: 'M12 3v12M8 7l4-4 4 4M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5',
  back: 'M15 6l-6 6 6 6',
  rate: 'M4 8h10M4 12h10M4 16h7M17 9l3 3-3 3',
  eye: 'M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
}

export function iconPath(name: IconName): string {
  return ICON_PATHS[name] || ICON_PATHS.file
}
