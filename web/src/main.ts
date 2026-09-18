/**
 * @file 应用入口
 * @description 创建 Vue 实例，注册 Pinia 与路由；先完成本地数据初始化再挂载，保证守卫可用。
 * 创建时间：2026-09-18
 */
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAppStore } from './stores/app'
import './styles/global.css'

/**
 * 启动应用
 * 执行逻辑：装配插件 → 初始化数据 → 挂载 DOM；异常时仍挂载以展示降级界面。
 *
 * @returns {Promise<void>}
 */
async function bootstrap(): Promise<void> {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  // 显式激活 Pinia，保证应用挂载前（如路由守卫）也能调用 store
  setActivePinia(pinia)
  app.use(router)

  try {
    const appStore = useAppStore()
    await appStore.init()
    await router.isReady()
  } catch (err) {
    // 初始化失败仍渲染，避免白屏
  } finally {
    app.mount('#app')
  }
}

void bootstrap()
