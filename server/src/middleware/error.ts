/**
 * @file 全局错误处理中间件
 * @description 统一错误响应格式；生产环境隐藏堆栈与内部细节，4xx 可返回字段级详情。
 * 创建时间：2026-09-18
 */
import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/errors.js'
import { config } from '../config.js'

/**
 * 统一错误处理
 *
 * @param {unknown} err - 捕获到的错误
 * @param {Request} _req - 请求
 * @param {Response} res - 响应
 * @param {NextFunction} _next - 下一个中间件
 * @returns {void}
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 优先识别业务错误与 body-parser 状态码（非法JSON=400、请求体过大=413、编码错误=415）
  let statusCode: number
  if (err instanceof AppError) {
    statusCode = err.statusCode
  } else if (
    err &&
    typeof err === 'object' &&
    'status' in err &&
    Number.isFinite(Number((err as { status: unknown }).status))
  ) {
    statusCode = Number((err as { status: number }).status)
  } else {
    statusCode = 500
  }
  const isClientError = statusCode >= 400 && statusCode < 500

  // 服务端错误在服务端记录，便于排查；不向客户端泄露内部信息
  if (!isClientError) {
    console.error('[server-error]', err)
  }

  res.status(statusCode).json({
    error: {
      code: statusCode,
      message:
        err instanceof AppError
          ? err.message
          : isClientError
            ? config.isProduction
              ? statusCode === 413
                ? '请求体过大'
                : statusCode === 415
                  ? '不支持的媒体类型'
                  : '请求体格式错误'
              : err instanceof Error
                ? err.message
                : '请求错误'
            : config.isProduction
              ? '服务器内部错误'
              : err instanceof Error
                ? err.message
                : '未知错误',
      // 仅 4xx 返回字段详情，生产 5xx 不返回堆栈
      ...(isClientError && err instanceof AppError && err.details
        ? { details: err.details }
        : {})
    }
  })
}

/**
 * 404 兜底
 *
 * @param {Request} _req - 请求
 * @param {Response} res - 响应
 * @returns {void}
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 404, message: '资源不存在' } })
}
