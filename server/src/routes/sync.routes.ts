/**
 * @file 加密保管箱同步路由（零知识）
 * @description 服务端只存取密文与 nonce，从不接触明文与密钥；所有操作以 JWT 用户 id 隔离。
 * 创建时间：2026-09-18
 */
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/database.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/errors.js'

/** 同步路由（全部需要认证） */
export const syncRouter = Router()

/** 上传密文校验：限制密文最大约 5MB、nonce 长度 */
const vaultSchema = z.object({
  ciphertext: z.string().min(1).max(5_000_000),
  nonce: z.string().min(8).max(256)
})

/** 保管箱行类型 */
interface VaultRow {
  user_id: string
  ciphertext: string
  nonce: string
  version: number
  updated_at: string
}

/**
 * 拉取自己的密文保管箱（不存在时 data 为 null）
 */
syncRouter.get(
  '/vault',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = db
      .prepare(
        'SELECT ciphertext, nonce, version, updated_at FROM vaults WHERE user_id = ?'
      )
      .get(req.userId) as Omit<VaultRow, 'user_id'> | undefined
    res.json({ data: row ?? null })
  })
)

/**
 * 上传/更新密文保管箱（按用户幂等 upsert，版本号自增）
 */
syncRouter.put(
  '/vault',
  requireAuth,
  validate(vaultSchema),
  asyncHandler(async (req, res) => {
    const { ciphertext, nonce } = req.body as z.infer<typeof vaultSchema>
    const result = db
      .prepare(
        `INSERT INTO vaults (user_id, ciphertext, nonce, version, updated_at)
         VALUES (?, ?, ?, 1, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           ciphertext = excluded.ciphertext,
           nonce      = excluded.nonce,
           version    = version + 1,
           updated_at = datetime('now')`
      )
      .run([req.userId, ciphertext, nonce])

    const row = db
      .prepare('SELECT version, updated_at FROM vaults WHERE user_id = ?')
      .get(req.userId) as { version: number; updated_at: string }

    res.json({
      synced: result.changes > 0,
      version: row.version,
      updatedAt: row.updated_at
    })
  })
)

/**
 * 删除自己的保管箱（数据可被用户自主清除）
 */
syncRouter.delete(
  '/vault',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = db.prepare('DELETE FROM vaults WHERE user_id = ?').run(req.userId)
    res.json({ deleted: result.changes > 0 })
  })
)
