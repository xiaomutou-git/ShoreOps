/**
 * @file Express 应用组装
 * @description 注册安全头、CORS、限流、JSON 解析与全部路由；导出 app 供启动与测试复用。
 * 创建时间：2026-09-18
 */
import express, { type Application } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import { authRouter } from './routes/auth.routes.js'
import { syncRouter } from './routes/sync.routes.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'

/**
 * 创建并配置 Express 应用
 *
 * @returns {Application} 已挂载中间件与路由的应用实例
 */
export function createApp(): Application {
  const app = express()

  // 信任反向代理（限流获取真实 IP）
  app.set('trust proxy', 1)

  // 安全响应头（含 CSP、X-Frame-Options、X-Content-Type-Options 等）
  app.use(helmet())

  // 跨域：默认放行，生产通过 CORS_ORIGIN 配置白名单
  app.use(
    cors({
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  )

  // 请求体大小与类型限制（密文较大，给到 12MB）
  app.use(express.json({ limit: '12mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))

  // 全局限流
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false
    })
  )

  // 认证接口更严格限流，缓解撞库与注册刷量
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 429, message: '尝试过于频繁，请稍后再试' } }
  })

  // 健康检查
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'shoreops-server' })
  })

  app.use('/api/auth', authLimiter, authRouter)
  app.use('/api/sync', syncRouter)

  // 404 与统一错误处理（必须最后注册）
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
