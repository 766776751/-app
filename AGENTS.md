# AGENTS.md

Vue expense/trip reimbursement app (报销神器). **Web-only.**

Git: remote `git@github.com:766776751/-app.git`；`main` = V1 稳定打包分支，`dev` = 开发分支。忽略 `node_modules` / `dist` / APK / zip / android build 产物（见 `.gitignore`）。

## Layout

| Path | What it is |
|------|------------|
| `web/` | **Vue 3 + Vite + Pinia + Dexie** app（主力） |
| `web/android/` | Capacitor Android shell → `报销统计神器-Vue.apk` |
| `DESIGN.md` | Vue 全量改造设计文稿 |
| `index.html` / `app-icon.svg` / `gen_launcher_icons.py` | 图标预览 / SVG 源 / 生成 mipmap webp |
| `报销统计神器-Vue.apk` | Android 安装包（交付） |
| `报销神器-vue.zip` | Web 工程打包 |
| ~~`note/`~~ | **已删除**（原生 Compose 版不再维护） |
| ~~`wear/`~~ | **已删除**（手表项目已废弃） |

### Web (Vue)

```powershell
cd web
npm install
npm run dev       # http://localhost:5173 (Vite, server.host=true)
npm run build     # vue-tsc -b --force && vite build → dist/  （类型失败会阻断打包）
npm run preview   # 本地预览 dist/ ：http://localhost:4173
npx cap sync android   # 把 dist/ 同步进 android/（须先 build）
cd android
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11"
.\gradlew.bat :app:assembleRelease --no-daemon
Copy-Item "app\build\outputs\apk\release\app-release.apk" "..\..\报销统计神器-Vue.apk" -Force
```

- Stack: Vue 3 `<script setup>` TS, Pinia (`trip`/`expense`/`settings`/`destination`/`template`), Dexie, hash router, 80ms fade.
- Capacitor: appId `com.lq.bxsb`, JDK **21** (`org.gradle.java.home` in `web/android/gradle.properties`), `android.overridePathCheck=true`, 阿里云 maven 优先。
- Plugins: `@capacitor/app`（分层返回）/ `status-bar` / `filesystem` / `share`.
- **Default vehicle = 新能源 (ELECTRIC)** built-in (personal app).
- **主题：全局浅色账本风**（阳光可读优先，`tokens.css` 浅色令牌；勿改回暗色仪表盘）。
- XLS: SpreadsheetML；标题 `私车公用{month}月里程统计汇总`；单位默认「公司」；金额列 **2 位小数**；末行合计；**Filesystem + Share**（勿 WebView Blob 下载）。
- JSON 备份 / 未报销 ZIP 同走 `shareBlob`；**导入前有差异预览弹窗**（禁止静默覆盖）；可「复制备份到剪贴板」。
- Numpad + `+` 累加；清空需二次确认；日期仅 `YYYY-MM-DD`。
- 启动图标：用户提供 PNG → `mipmap-*/ic_launcher*.webp` only；**禁止** `mipmap-anydpi-v26` 自适应 XML（会变机器人）。
- Vue 侧：列表用 `key`，导航 80ms fade，**不要** `EnterTransition.None`。
- **pdfjs / jszip 动态 import**（独立 chunk），勿改回静态 import。
- 报销筛选写入 `localStorage`（key `bxsb_expense_filters`）。
- 目的地最多 50 条，超出自动淘汰低频；回收站软删超 90 天提示清理。
- 数据库打开走 `openBxsbDb()` 重试（安卓 WebView IndexedDB 偶发失败）。

> ⚠️ ~~构建不拦截类型错误~~：**已改为 `&&`**——`build` = `vue-tsc -b --force && vite build`，类型检查失败会阻断打包（勿改回 `||`，否则 tsc 成功时可能跳过 vite 导致 dist 陈旧）。
> **无 lint / 无测试**：仓库未配置 ESLint / Prettier / Vitest / Jest，`package.json` 仅含 dev / build / preview。如需单测建议引入 Vitest（与 Vite 同构，零额外配置），运行单测即 `npx vitest run src/utils/xlsExporter.spec.ts`。

### Ship / ADB

```powershell
# after assembleRelease + copy to package root
$adb = "C:\Users\LQ\AppData\Local\Android\Sdk\platform-tools\adb.exe"
Start-Process -FilePath $adb -ArgumentList @("install","-r","D:\123pan\Downloads\报销统计神器0817_1\报销统计神器-Vue.apk") -NoNewWindow -PassThru
Start-Sleep -Seconds 5
```

- Device: `3145d146`. **Do not block on adb** — fire-and-forget + sleep 5s = success.
- `INSTALL_FAILED_USER_RESTRICTED` → retry install；用户在手机点允许。

### Feature notes

- 行程导出 / 未报销 ZIP：日期升序、附件命名 `项目名_编号_日期_金额`
- 发票类 PDF：Capacitor WebView 内 iframe 预览
- 空态、快捷区完整中文名（最长「常用目的地」）
- 返回：子页层级回退；主页 2 秒内双击返回才退出

## Architecture (Vue)

```text
pages/*  →  stores (Pinia)  →  db/schema (Dexie IndexedDB)
utils/   xlsExporter · shareBlob · pendingExport · attachmentName · imageCompress · numeric · icons · date · thumb
components/ AppIcon · ScreenHeader · NumericPad · TripCalendar · AttachmentPreview · BottomNav
types/*  ·  styles/tokens.css · styles/app.css
```

- **路径别名 `@` → `src`**（`vite.config.ts` 的 resolve.alias）。所有 import 用 `@/...`，勿用相对路径深跳。
- **单 Dexie 库 `bxsb`**（`db/schema.ts`），6 张表：`trips` / `expenses` / `settings` / `attachments`(存 Blob，非文件) / `destinations` / `templates`。v1→v2 迁移新增 `destinations` + `templates`（升级时若 destinations 为空则写入默认「公司」）。启动用 `openBxsbDb()` 重试打开。
- **软删除**：`trips.isDeleted` 标记驱动「回收站」(`/recycle-bin`)；`expenses` 用 `status` 字段（非删除）。导出/统计前一律用 `!isDeleted` 过滤（见 `xlsExporter.sortTrips`），否则会带出已删行程。
- `ensureSettings()` 保证 `defaultVehicleType = 'ELECTRIC'`（专属 App 默认新能源，见 `types/settings.ts` 的 `DEFAULT_SETTINGS`）。
- 各 store 包一个 Dexie 表，暴露 `load()` + computed 过滤视图（如 `expense` 的 `records` 按分类/状态/关键字） + CRUD；首包用 `isLoading` 关 loading，切页勿全量 reload。
- 路由：`createWebHashHistory`（hash 模式），10 条懒加载路由（`router/index.ts`），含 `/recycle-bin`。
- 附件：`image` 直接预览，`pdf` 走 `pdfjs-dist`（Capacitor WebView 内 iframe）。导出/分享统一走 `shareBlob.ts`（Android 用 Filesystem+Share，Web 回退）。
- 设计令牌集中在 `styles/tokens.css`，全局样式 `styles/app.css`。
- XLS 导出：SpreadsheetML；标题 `私车公用{month}月里程统计汇总`；单位默认「公司」；末行合计（见 `utils/xlsExporter.ts` 的 `tripSheetTitle` / `DEFAULT_COMPANY`）。
