/**
 * @file Express 请求类型扩展
 * @description 在 Request 上声明认证后的 userId 字段。
 * 创建时间：2026-09-18
 */
import 'express'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** 认证中间件写入的当前用户 id */
      userId?: string
    }
  }
}

export {}
