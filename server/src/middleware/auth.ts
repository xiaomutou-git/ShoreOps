/**
 * @file JWT 认证中间件
 * @description 校验 Authorization: Bearer <token>，通过后把用户 id 写入 req.userId。
 * 创建时间：2026-09-18
 */
import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../utils/token.js'
import { AppError } from '../utils/errors.js'

/**
 * 强制认证：无令牌或令牌非法时返回 401
 *
 * @param {Request} req - 请求对象
 * @param {Response} _res - 响应对象（未使用）
 * @param {NextFunction} next - 下一个中间件
 * @returns {void}
 * @throws {AppError} 401 未提供令牌或令牌无效
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError(401, '未提供认证令牌')
    }
    const token = header.slice('Bearer '.length).trim()
    if (!token) {
      throw new AppError(401, '认证令牌为空')
    }
    const payload = verifyToken(token)
    req.userId = payload.sub
    next()
  } catch (err) {
    if (err instanceof AppError) {
      next(err)
    } else {
      next(new AppError(401, '认证失败，请重新登录'))
    }
  }
}
