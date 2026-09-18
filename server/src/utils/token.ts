/**
 * @file JWT 令牌工具
 * @description 签发与校验 Access Token，载荷仅包含用户 id（最小化声明）。
 * 创建时间：2026-09-18
 */
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

/** Token 载荷类型 */
export interface TokenPayload {
  /** 用户 id */
  sub: string
}

/**
 * 签发令牌
 *
 * @param {string} userId - 用户 id
 * @returns {string} 签名后的 JWT
 * @throws {Error} 签发失败时抛出
 */
export function signToken(userId: string): string {
  try {
    const payload: TokenPayload = { sub: userId }
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    })
  } catch (err) {
    throw new Error('令牌签发失败')
  }
}

/**
 * 校验令牌
 *
 * @param {string} token - JWT 字符串
 * @returns {TokenPayload} 解析出的载荷
 * @throws {Error} 令牌无效或过期时抛出
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload
    if (!decoded.sub) {
      throw new Error('令牌缺少主体')
    }
    return { sub: decoded.sub }
  } catch (err) {
    throw new Error('无效或过期的令牌')
  }
}
