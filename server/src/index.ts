/**
 * @file 服务启动入口
 * @description 创建应用并监听配置端口；捕获启动级异常避免进程静默崩溃。
 * 创建时间：2026-09-18
 */
import { createApp } from './app.js'
import { config } from './config.js'
import { initDatabase } from './db/database.js'

/**
 * 异步启动：先完成数据库初始化再对外提供服务
 *
 * @returns {Promise<void>}
 */
async function start(): Promise<void> {
  await initDatabase()
  const app = createApp()
  app.listen(config.port, () => {
    console.log(`[ShoreOps] 同步服务已启动: http://localhost:${config.port}`)
    console.log('[ShoreOps] 健康检查: /api/health')
  })
}

start().catch((err: unknown) => {
  console.error('[ShoreOps] 启动失败:', err)
  process.exit(1)
})
