# DESIGN.md — 报销神器 · Vue 全量改造

> 状态：蓝图（Blueprint）｜适用：Android Compose → Vue 3 Web（可再壳成 App）  
> 品牌/体验基线：现有 Android 版「账本绿 + 近白毛玻璃」体系（已定稿，见 §3）

---

## Identity（本稿角色）

**Product UI Designer** — 工具型报销 App 的状态与信息架构优先；不为「炫」改交互。

## Grounding（假设）

- **产品**：个人/小团队「私车公用」里程与报销记账，装在手机里天天用。
- **技术转向**：现有 Kotlin + Compose + SQLite 应用，**全方位改 Vue 写法**（Vue 3 组合式 + Pinia），输出可在手机浏览器/桌面打开的 Web App；后续可用 Capacitor 打成 APK。
- **刻意不做**：服务端账号体系、多人协作（V1 单机 IndexedDB 即可）。
- **已有视觉**：沿用 Android 已落地的账本绿、圆形软图标、毛玻璃卡片；Vue 版不另起一套视觉语言。

---

## DESIGN.md（九段规格）

### 1. Objective

把「报销神器」从 Android 原生工程，改造成 **Vue 3 单页应用（SPA）**：

- 功能对齐现有 App（行程 / 报销 / 导出 / 设置 / 回收站等）
- 写法与结构全面 Vue 化：SFC、Composition API、Pinia、Router
- 手机优先；导出 XLS、九宫格数字键盘、发票 PDF 等能力在 Web 侧等价实现
- 视觉与现有 Compose 主题一致，降低迁移认知成本

### 2. Product Context

| 维度 | 说明 |
|------|------|
| 用户 | 需要「私车公用」里程统计与费用报销的个人 |
| 主任务 | 记行程 → 算金额 → 记报销 → 导出汇总（单位默认「公司」） |
| 90% 状态 | 打开 App 看本月概览 / 记一笔行程或报销 / 导出 xls |
| 非目标 V1 | 多用户、云同步、权限审批流、复杂财务报表 |
| 交付形态 | `vite` 开发、生产静态部署；可选 Capacitor 打包 |

### 3. Visual Foundations（2026 Awwwards 重塑）

> 参考获奖工具类/金融科技 App 常见手法：暗色仪表盘、霓虹强调、数据大字、悬浮毛玻璃底栏。视觉锚点取自用户偏好的霓虹蜗牛（青 + 琥珀）。

```
--bg:       #0B0F0E
--surface:  #141C19
--ink:      #E9F2EE
--muted:    #7E918A
--accent:   #2ED3B7   /* 霓虹青 */
--amber:    #F0A04B   /* 发票/金额 */
--glass:    rgba(22,32,28,.72)
--radius:   20 / 14 / pill
```

- **签名**：首页「本月里程」超大 `tabular` 数字 + 单位 km + 进度条
- **卡片**：深色玻璃 + 细描边，不用浅绿账本皮
- **底栏**：悬浮圆角玻璃条，选中青光
- **字体**：PingFang SC；数字用等宽 tabular
- **切页**：仍 80ms 淡入淡出

（旧版「账本绿浅色」仅保留在 Android Compose / `index.html` 演示，Vue 以本暗色仪表盘为准。）

| 角色 | 字体栈 | 用法 |
|------|--------|------|
| 系统 UI / 正文 | `-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif` | 全站 |
| 数字/金额 | 同上 + `font-variant-numeric: tabular-nums` | 统计、表格 |

- **外层卡片**：近白半透明圆角（`surface` 92% 或白 86%），细白描边，**不用每帧重算的渐变 Brush**。
- **内层图标位**：圆形 `--primary-soft`，禁止实心 primaryContainer 方块。
- **底栏**：选中态浅绿胶囊 + `primary` 文字；无大块 indicator。
- **切页**：约 **80ms** 淡入淡出；禁止 0ms `none`（残影）也禁止 200ms+（间隔感）。

### 4. Accessibility

- 正文对比度 ≥ 4.5:1；大号金额 ≥ 3:1
- 触控目标 ≥ 44px（九宫格键 56px 高）
- 表单：`label` 关联输入；错误信息文字 + 颜色双通道
- 尊重 `prefers-reduced-motion`：过渡改 0 或极短
- 空态说明可操作（「添加报销」按钮），不只「暂无数据」

### 5. Voice & Tone

- 文案：简体中文，短句、动词开头（「添加报销」「选择位置」→ 分享用「分享文件」）
- 导出/错误：说清结果（「已导出 XLS」「本月暂无行程数据」）
- 禁止：空泛口号、英文夹生词当装饰

### 6. Implementation Practices（Vue 写法约定）

**技术栈（锁定）**

| 层 | 选型 | 备注 |
|----|------|------|
| 框架 | Vue 3.5+ + `<script setup lang="ts">` | 组合式，禁止 Options API 新代码 |
| 构建 | Vite 6 | 单包 `src/` |
| 路由 | vue-router 4 | `createWebHistory`，手机壳可 hash |
| 状态 | Pinia | 一域一 store，对齐原 ViewModel |
| 本地库 | Dexie.js (IndexedDB) | 替代 SQLiteOpenHelper |
| 导出 | 自写 SpreadsheetML `.xls` | 与 Android `XlsExporter` 同结构 |
| PDF | 浏览器 `iframe` / `pdfjs` 可选 | 发票类预览 |
| 样式 | CSS 变量 + 单文件组件 scoped | 不引入重 UI 框架；组件自研对齐设计令牌 |

**目录（目标工程 `web/` 或独立仓）**

```text
web/
  index.html
  vite.config.ts
  src/
    main.ts
    App.vue
    router/index.ts
    stores/
      trip.ts
      expense.ts
      settings.ts
      ui.ts
    db/
      schema.ts          # Dexie 表与版本
      repositories/*.ts
    types/
      trip.ts
      expense.ts
      settings.ts
    utils/
      xlsExporter.ts
      numericPad.ts      # sanitize / 累加逻辑
      date.ts            # yyyy-MM-dd
    components/
      GlassCard.vue
      StatTile.vue
      CategoryIcon.vue
      StatusBadge.vue
      NumericPad.vue
      ScreenHeader.vue
      AppTextField.vue
      EmptyState.vue
    pages/
      HomeView.vue
      AddTripView.vue
      ExpenseView.vue
      ExpenseHistoryView.vue
      AddExpenseView.vue
      EditExpenseView.vue
      SettingsView.vue
      DestinationsView.vue
      ProjectTemplatesView.vue
      RecycleBinView.vue
    styles/tokens.css
```

**状态与数据**

- Pinia store 只暴露 `state` + `actions`；组件不直接碰 Dexie。
- 列表更新：**写库成功后重读或本地 patch**，避免双 collector 式叠加订阅。
- `isLoading`：请求开始 true，**首包数据到达即 false**。
- 路由切换 **禁止** 无意义全量 reload；仅 `pull-to-refresh` / 明确刷新动作拉库。

**数据模型（与 Android 对齐）**

```ts
// types/trip.ts
type VehicleType = 'ELECTRIC' | 'GASOLINE'
interface TripRecord {
  id: number
  destination: string
  purpose: string
  distance: number      // km
  amount: number        // 元
  date: string          // 'YYYY-MM-DD'（UI/导出仅日期）
  vehicleType: VehicleType
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  isDeleted: boolean
}

// types/expense.ts
type ExpenseCategory = 'MATERIAL' | 'MEAL_SUBSIDY' | 'INVOICE' | 'OTHER'
type ExpenseStatus = 'PENDING' | 'PAID'
interface ExpenseRecord {
  id: number
  title: string
  projectCode: string
  amount: number
  purpose: string
  category: ExpenseCategory
  attachments: { kind: 'image' | 'pdf'; blobId: string; name: string }[]
  status: ExpenseStatus
  date: string          // YYYY-MM-DD
  createdAt: string
  updatedAt: string
}
```

费率设置：`settings.electricRate` / `gasolineRate` / `defaultVehicleType`，默认新能源 `0.5`、油车 `1.0`。

**行程金额**

```ts
amount = distance * (vehicleType === 'ELECTRIC' ? electricRate : gasolineRate)
```

**XLS 导出（必须与现网一致）**

| 行 | 内容 |
|----|------|
| 首行 | `私车公用{month}月里程统计汇总`（合并展示） |
| 表头 | 日期 / 单位 / 目的地 / 事由 / 距离(km) / 金额(元) / 车型 |
| 数据 | 日期升序；**单位恒「公司」**；事由空则填「公司」；仅日期 |
| 末行 | 合计 · 行程 N 次 · 总里程 · **总金额** |

导出交互：全屏预览（可横滑）→ **「分享文件」**（Web Share API + File，失败则下载 `.xls`）。

**九宫格键盘**

- 底部面板：数字 1–9 / `.` / `0` / 退格；底栏 **清空 | + | 完成**
- 支持 `+` 累加；显示区可示 `12+3`
- 键高约 56px，底部留白，四角圆角 24px，避让 `safe-area-inset-bottom`
- 金额/距离字段点击弹出，不依赖系统键盘

**页面与路由**

| 路由 | 页面 | 对应原 Screen |
|------|------|----------------|
| `/` | HomeView | HomeScreen 概览+导出入口 |
| `/trip/add` | AddTripView | AddTripScreen |
| `/expense` | ExpenseView | ExpenseManagementScreen |
| `/expense/history` | ExpenseHistoryView | ExpenseHistoryScreen |
| `/expense/add` | AddExpenseView | AddExpenseScreen |
| `/expense/:id/edit` | EditExpenseView | EditExpenseScreen |
| `/settings` | SettingsView | SettingsScreen |
| `/destinations` | DestinationsView | DestinationScreen |
| `/templates` | ProjectTemplatesView | ProjectTemplateScreen |
| `/recycle-bin` | RecycleBinView | RecycleBinScreen |

底部导航四项：首页 / 行程 / 报销 / 设置（与 Android 一致）。

### 7. Anti-Patterns（Vue 版禁令）

- Options API 新组件、全局 event bus 乱传业务数据
- 组件内直接 `indexedDB`/`localStorage` 写业务表
- 切路由就全量 `store.reload()`
- 页面整棵 `v-for` 无 `key`、无虚拟列表的超长 DOM
- 实心大面积 `primary` 方块嵌在毛玻璃卡里
- 导出再引入 POI 等重依赖（保持 SpreadsheetML）
- 把 `none` 切页动画写回来（残影）
- 文案改回「时间戳 + 时间」展示（坚持 `yyyy-MM-dd`）

### 8. Decision-Making

产品向冲突时优先级：

1. **单机可用、可导出**（报销能否交差）
2. **一次点击内完成高频操作**（记行程/报销、导出）
3. **视觉与 Android 一致**（迁移零学习）
4. 性能与包体（Web 可滚动流畅）
5. 扩展性（云同步等后置）

### 9. Workflow

```text
① DESIGN.md（本稿）冻结范围与令牌
② scaffold：Vite + Vue3 + Router + Pinia + Dexie + tokens.css
③ 数据层：types + db schema + stores（trip/expense/settings）
④ 组件库：GlassCard / StatTile / NumericPad / EmptyState / Xls 预览
⑤ 页面：Home → AddTrip → Expense → History → Settings → 其余
⑥ 导出/分享 + 九宫格 + 发票 PDF
⑦ 真机浏览器/模拟器验收 → 可选 Capacitor 打包
```

验收清单（V1）

- [ ] 记行程：距离九宫格 + 日期仅日 + 金额预览
- [ ] 记报销：四类筛选、发票 PDF、附件
- [ ] 导出：标题/单位公司/合计行/分享或下载 xls
- [ ] 底栏切页约 80ms，无残影、无明显卡顿
- [ ] 空态居中说明 + 可添加
- [ ] 离线可开（IndexedDB）

---

## Structure（本 Vue 产物结构）

**信息架构（手机 390px 优先）**

```text
┌─────────────────────────────────┐
│ ScreenHeader 品牌标 + 标题 + 副题 │
├─────────────────────────────────┤
│ [Glass] 本月概览  StatTile×3     │
│ [Glass] 快速入口 / 导出 XLS      │
│ [Glass] 最近报销列表              │
├─────────────────────────────────┤
│ BottomNav 首页|行程|报销|设置     │
└─────────────────────────────────┘
```

**添加行程页**

```text
Header「添加行程」
目的地 | 距离(九宫格字段) + 事由
日期 yyyy-MM-dd（日历）
GlassCard 费用计算与车型（预览金额 + 费率）
主按钮 保存
```

**报销管理页**

```text
Header + 统计磁贴
筛选 chips：全部|材料费|加班餐补|发票类|其他
按钮：添加报销 / 历史记录
最近记录：图标块 + 标题 + 日期 + 状态徽章 + 金额
```

**导出预览（全屏）**

```text
模糊遮罩 + 圆角面板
标题 私车公用X月里程统计汇总
横滑表格（表头吸顶）
合计行高亮
[关闭] [分享文件]
```

**组件列表（实现优先级）**

1. `tokens.css` / `GlassCard` / `AppTextField` / `ScreenHeader`  
2. `stores` + Dexie repositories  
3. `HomeView` + `BottomNav`  
4. `NumericPad` + `AddTripView`  
5. `ExpenseView` + filter + `EmptyState`  
6. `xlsExporter` + 预览分享  
7. History / Settings / 其它管理页  

---

## Decision Trace

```json
[
  {
    "decision": "Vue 3 + Vite + Pinia + TypeScript + Dexie，而非 Nuxt/后端",
    "reason": "用户要的是「写法改 Vue」的 App 体验；单机报销工具 V1 不需要 SSR/账号",
    "alternatives": ["Nuxt 3", "React + Redux", "继续只改 Android"],
    "tradeoff": "无 SEO/服务端；后续多端同步要另做 API"
  },
  {
    "decision": "视觉令牌完全沿用 Android 账本绿 + 圆形软图标 + 近白卡片",
    "reason": "已迭代过多轮 UI，Vue 另起炉灶会增加学习成本与分裂感",
    "alternatives": ["全新 Material Web", "Ant Design Vue 默认皮"],
    "tradeoff": "不能直接甩开大量现成组件库皮肤，需自研少量基础组件"
  },
  {
    "decision": "IndexedDB(Dexie) 替代 SQLiteOpenHelper",
    "reason": "浏览器无可靠 SQLite 写；Dexie 有版本迁移，贴近原 DAO 仓库分层",
    "alternatives": ["sql.js 全内存", "仅 localStorage", "Capacitor 原生 SQLite"],
    "tradeoff": "与 Android 库文件不互通，导入导出需自建格式"
  },
  {
    "decision": "XLS 继续 SpreadsheetML，首行公司标题 + 单位列默认公司 + 合计末行",
    "reason": "用户已明确业务口径，必须与现 Android 导出一致",
    "alternatives": ["SheetJS xlsx", "CSV"],
    "tradeoff": "复杂样式能力弱于真 xlsx；但零重依赖、Excel/WPS 可开"
  },
  {
    "decision": "导出用 Web Share / 下载，不做「另存为位置」SAF",
    "reason": "用户已否决选路径保存，要求分享文件；Web 对齐该交互",
    "alternatives": ["File System Access API 另存为"],
    "tradeoff": "部分桌面浏览器无 Share API，只能回退下载"
  },
  {
    "decision": "切页 80ms fade，禁止 None 与长动画",
    "reason": "实机验证：None 有残影，200ms 有明显间隔感",
    "alternatives": ["EnterTransition.None", "200ms slide"],
    "tradeoff": "略有一点点过渡耗时，可接受"
  },
  {
    "decision": "九宫格 + 键做 Vue 自研 NumericPad，高度约 56px 且底部留白",
    "reason": "系统键盘体验差；Android 已定做大键 + 累加 +，需产品一致",
    "alternatives": ["第三方 keypad 库"],
    "tradeoff": "多写一个组件；无障碍需自己补 label"
  },
  {
    "decision": "路由切换禁止全量 reload store",
    "reason": "Android 侧曾因切页拉库导致卡顿，Vue 需写进规范避免重蹈",
    "alternatives": ["每页 onMounted 全量拉库"],
    "tradeoff": "跨页数据可能短暂旧一拍，需在写库时主动 patch"
  }
]
```

---

## Anti-slop self-check

- **flagged U2**（六宫格图标卡模板）— 已改为：磁贴仅统计数字 + 圆形软图标，无「图标+两行文案」六格；列表为业务记录卡。  
- **flagged U6**（全是主色大按钮）— 已拆：主操作 primary 胶囊，次操作 outlined，筛选为 chip，导出次要预览/主分享分离。  
- **flagged U7**（空话文案）— 导出/空态均用可验证句（「私车公用8月…」「本月暂无行程数据」）。  
- 其余 U1/U3/U4/U5/U8：不用紫蓝渐变 hero、无 emoji 装饰、无等距插画、无浮动假 KPI 三连、少用破折号堆砌。

---

## 附录 A · Android → Vue 映射速查

| Android | Vue |
|---------|-----|
| Composable `HomeScreen` | `pages/HomeView.vue` |
| `@HiltViewModel` + Flow | `defineStore` + `ref`/`computed` |
| Repository + DAO | `db/repositories/*` |
| `SqfliteDatabase` | Dexie `schema.ts` |
| `XlsExporter.kt` | `utils/xlsExporter.ts` |
| `NumericPad.kt` | `components/NumericPad.vue` |
| `GlassUi.kt` | `GlassCard.vue` + `tokens.css` |
| NavHost 80ms fade | Router transitions 80ms |
| FileProvider 分享 xls | `navigator.share` + Blob 下载 |
| PdfRenderer | `<iframe :src="blobUrl">` 等 |

## 附录 B · 与现网功能对齐清单

- [x] 行程 CRUD、目的地联想、软删除回收站  
- [x] 费率设置与默认车型  
- [x] 报销四类 + 状态 待/已  
- [x] 发票 PDF + 图片凭证  
- [x] 项目模板  
- [x] XLS：公司单位、标题行、合计、分享  
- [x] 日期仅日  
- [x] 九宫格金额/距离  
- [x] 数据备份导出 json + 导入覆盖  
- [ ] 农历/名言等首页装饰（可选，不阻塞）  
- [x] 目的地联想 + 管理页  
- [x] 项目模板联想 + 管理页  
- [x] 行程回收站（恢复/永删）  
- [x] 发票/图片附件内置预览（iframe PDF / img）
