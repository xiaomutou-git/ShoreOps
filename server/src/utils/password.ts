/**
 * @file 密码哈希工具
 * @description 基于 bcryptjs 对用户口令进行单向哈希与校验，禁止明文落库。
 * 创建时间：2026-09-18
 */
import bcrypt from 'bcryptjs'
import { config } from '../config.js'

/**
 * 哈希明文密码
 *
 * @param {string} plain - 明文密码
 * @returns {Promise<string>} bcrypt 哈希串
 * @throws {Error} 哈希计算失败时抛出
 */
export async function hashPassword(plain: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(config.bcryptRounds)
    return bcrypt.hash(plain, salt)
  } catch (err) {
    throw new Error('密码哈希失败')
  }
}

/**
 * 校验明文密码与哈希是否匹配
 *
 * @param {string} plain - 明文密码
 * @param {string} hash - 已存储的哈希
 * @returns {Promise<boolean>} 匹配返回 true
 */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  try {
    return bcrypt.compare(plain, hash)
  } catch (err) {
    // 校验异常按不匹配处理，避免异常向上泄露
    return false
  }
}
