/**
 * @file 服务端运行配置
 * @description 集中读取环境变量并给出安全默认值；生产环境必须通过环境变量覆盖 JWT 密钥。
 * 创建时间：2026-09-18
 */

/**
 * 配置对象类型
 */
export interface AppConfig {
  /** HTTP 监听端口 */
  port: number
  /** JWT 签名密钥 */
  jwtSecret: string
  /** Access Token 有效期 */
  jwtExpiresIn: string
  /** SQLite 数据库文件路径 */
  dbPath: string
  /** 允许的 CORS 来源（* 表示不限制，生产应配置白名单） */
  corsOrigin: string | string[]
  /** bcrypt 哈希成本因子 */
  bcryptRounds: number
  /** 是否生产环境（生产隐藏错误堆栈） */
  isProduction: boolean
}

/**
 * 读取并组装配置
 *
 * @returns {AppConfig} 解析后的配置
 * @throws {Error} 当生产环境未提供 JWT_SECRET 时抛出，阻止使用弱密钥启动
 */
function loadConfig(): AppConfig {
  const isProduction = process.env.NODE_ENV === 'production'
  const secret = process.env.JWT_SECRET
  if (isProduction && (!secret || secret.length < 32)) {
    throw new Error('生产环境必须通过环境变量提供至少 32 位的 JWT_SECRET')
  }
  return {
    port: Number(process.env.PORT ?? 4000),
    // 开发环境使用固定随机风格密钥；生产强制外部注入
    jwtSecret: secret ?? 'shoreops-dev-only-secret-change-me-in-production-0123456789',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    dbPath: process.env.DB_PATH ?? './data/shoreops.db',
    corsOrigin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : '*',
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
    isProduction
  }
}

export const config = loadConfig()
