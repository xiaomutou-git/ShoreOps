/**
 * @file 认证路由
 * @description 提供注册、登录、当前用户信息接口；口令经 bcrypt 单向哈希，签发 JWT。
 * 创建时间：2026-09-18
 */
import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '../db/database.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../utils/errors.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { signToken } from '../utils/token.js'

/** 认证路由 */
export const authRouter = Router()

/** 注册/登录请求体校验 */
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128)
})

/** 用户行类型 */
interface UserRow {
  id: string
  email: string
  password_hash: string
  created_at: string
}

/**
 * 注册：邮箱唯一，成功后直接签发令牌
 */
authRouter.post(
  '/register',
  validate(credentialsSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof credentialsSchema>

    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email) as { id: string } | undefined
    if (existing) {
      throw new AppError(409, '该邮箱已注册')
    }

    const passwordHash = await hashPassword(password)
    const id = randomUUID()

    db.prepare(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)'
    ).run(id, email, passwordHash)

    const token = signToken(id)
    res.status(201).json({ token, user: { id, email } })
  })
)

/**
 * 登录：校验邮箱与密码，失败统一返回模糊信息避免账号枚举
 */
authRouter.post(
  '/login',
  validate(credentialsSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof credentialsSchema>

    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as UserRow | undefined

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new AppError(401, '邮箱或密码错误')
    }

    const token = signToken(user.id)
    res.json({ token, user: { id: user.id, email: user.email } })
  })
)

/**
 * 获取当前登录用户
 */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = db
      .prepare('SELECT id, email, created_at FROM users WHERE id = ?')
      .get(req.userId) as { id: string; email: string; created_at: string } | undefined
    if (!user) {
      throw new AppError(404, '用户不存在')
    }
    res.json({ user })
  })
)
