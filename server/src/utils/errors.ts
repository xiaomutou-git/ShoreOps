/**
 * @file 统一错误类型与异步捕获
 * @description 提供可携带 HTTP 状态码的业务错误，以及把 async 路由异常转交错误中间件的包装器。
 * 创建时间：2026-09-18
 */
import type { NextFunction, Request, Response } from 'express'

/**
 * 应用业务错误
 */
export class AppError extends Error {
  /** HTTP 状态码 */
  readonly statusCode: number
  /** 附加详情（仅在非生产环境或 4xx 时返回） */
  readonly details?: unknown

  /**
   * @param {number} statusCode - HTTP 状态码
   * @param {string} message - 错误信息
   * @param {unknown} details - 附加详情
   */
  constructor(statusCode: number, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * 包装异步路由处理器，自动 catch 并 next(err)
 *
 * @param {(req:Request,res:Response)=>Promise<unknown>} fn - 异步处理函数
 * @returns {(req:Request,res:Response,next:NextFunction)=>void} Express 处理器
 */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res)).catch(next)
  }
}
