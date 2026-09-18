/**
 * @file 请求体校验中间件
 * @description 使用 zod schema 校验请求体，失败返回 400 与字段级错误。
 * 创建时间：2026-09-18
 */
import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from '../utils/errors.js'

/**
 * 生成校验中间件
 *
 * @param {ZodSchema} schema - zod 模式
 * @returns {(req:Request,res:Response,next:NextFunction)=>void} 中间件
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      next(
        new AppError(
          400,
          '请求参数校验失败',
          result.error.flatten().fieldErrors
        )
      )
      return
    }
    req.body = result.data
    next()
  }
}
