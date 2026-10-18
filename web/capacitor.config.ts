import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.lq.bxsb',
  appName: '报销神器',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    statusBarOverlaysWebView: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#0b0f0e',
    },
    App: {
      // launchMode: singleTask；返回由 JS 处理
    },
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
