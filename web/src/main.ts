import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import App from './App.vue'
import router from './router'
import { openBxsbDb } from './db/schema'
import './styles/tokens.css'
import './styles/app.css'

async function applyNativeChrome() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0b0f0e' }).catch(() => undefined)
    document.documentElement.style.setProperty('--status-bar-h', '0px')
  } catch (e) {
    console.warn('StatusBar setup failed', e)
    document.documentElement.style.setProperty('--status-bar-h', '28px')
  }
}

const HOME = '/'

function normalizePath(raw?: string | null): string {
  let p = raw || '/'
  // hash 路由可能出现 fullPath=/ 或 path=/
  p = p.split('?')[0].split('#')[0] || '/'
  if (!p.startsWith('/')) p = '/' + p
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p || '/'
}

function parentOf(path: string): string {
  if (path === HOME) return HOME
  if (path.startsWith('/expense/') && path !== '/expense') return '/expense'
  if (path === '/destinations' || path === '/templates' || path === '/recycle-bin') return HOME
  // Tab 页 → 首页
  return HOME
}

function showBackToast(msg: string) {
  let el = document.getElementById('back-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'back-toast'
    el.className = 'toast'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.classList.add('show')
  window.clearTimeout((el as unknown as { _t?: number })._t)
  ;(el as unknown as { _t?: number })._t = window.setTimeout(() => {
    el?.classList.remove('show')
  }, 1600)
}

let lastBackAt = 0
let handling = false

/** 统一返回：子页层级回退；主页 2 秒内双击返回才退出 */
async function handleSystemBack() {
  if (handling) return
  handling = true
  try {
    const path = normalizePath(router.currentRoute.value?.path)

    if (path === HOME) {
      const now = Date.now()
      if (now - lastBackAt < 2000) {
        // 主页二次返回 → 退出
        try {
          await CapApp.exitApp()
        } catch {
          /* ignore */
        }
      } else {
        lastBackAt = now
        showBackToast('再按一次返回退出')
      }
      return
    }

    const parent = parentOf(path)
    if (parent === path) {
      await router.replace(HOME)
    } else if (router.options.history.state?.back) {
      router.back()
    } else {
      await router.replace(parent)
    }
  } finally {
    window.setTimeout(() => {
      handling = false
    }, 80)
  }
}

async function setupBackGuards() {
  // 浏览器/WebView 历史陷阱：避免系统侧滑直接出栈退出
  try {
    history.pushState({ bxsb: true, home: true }, '', location.href)
  } catch {
    /* ignore */
  }

  window.addEventListener('popstate', () => {
    // 系统返回/手势触发时优先走 App 逻辑
    void handleSystemBack()
    // 在主页时把历史顶回去，防止 WebView 退到底层后 Android finish
    try {
      const path = normalizePath(router.currentRoute.value?.path)
      history.pushState({ bxsb: true, path }, '', location.href)
    } catch {
      /* ignore */
    }
  })

  if (!Capacitor.isNativePlatform()) return
  try {
    await CapApp.addListener('backButton', () => {
      void handleSystemBack()
    })
  } catch (e) {
    console.warn('backButton listener failed', e)
  }
}

applyNativeChrome()
void setupBackGuards()
void openBxsbDb().catch((e) => console.warn('IndexedDB open retry failed', e))

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
