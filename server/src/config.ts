/**
 * @file 服务端运行配置
 * @description 集中读取环境变量；JWT 密钥必须由环境提供，仓库内不保留任何可用的默认密钥。
 * 创建时间：2026-09-18
 * 变更记录：2026-10-10 安全修复——移除硬编码的 JWT 回退密钥（原 fail-open 行为），
 *           改为生产环境缺失即拒绝启动、开发/测试环境每次启动生成一次性随机密钥；
 *           CORS 在生产环境禁止通配符。
 */
import { randomBytes } from 'node:crypto'

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
 * 安全策略（fail-closed）：
 * - 生产环境：必须通过 JWT_SECRET 提供 ≥32 位密钥，否则拒绝启动；
 * - 开发/测试环境：未配置时在本次启动内生成一次性随机密钥（仅本进程有效，
 *   重启即失效），绝不使用任何硬编码的公开默认值；
 * - CORS：生产环境禁止 '*'，必须显式配置来源白名单。
 *
 * @returns {AppConfig} 解析后的配置
 * @throws {Error} 生产环境缺少有效 JWT_SECRET 或使用 CORS 通配符时抛出
 */
function loadConfig(): AppConfig {
  const isProduction = process.env.NODE_ENV === 'production'
  const secret = process.env.JWT_SECRET

  if (isProduction && (!secret || secret.length < 32)) {
    throw new Error('生产环境必须通过环境变量提供至少 32 位的 JWT_SECRET')
  }
  if (!secret) {
    console.warn(
      '[config] 未设置 JWT_SECRET：本次启动已生成一次性随机密钥（仅限开发/测试，重启后旧令牌全部失效）。'
    )
  }

  const corsRaw = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.trim() : ''
  const corsOrigin: string | string[] =
    !corsRaw || corsRaw === '*'
      ? '*'
      : corsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
  if (isProduction && corsOrigin === '*') {
    throw new Error('生产环境必须通过环境变量 CORS_ORIGIN 配置来源白名单，禁止使用 "*"')
  }

  return {
    port: Number(process.env.PORT ?? 4000),
    // 生产：外部注入；开发/测试：一次性随机密钥（不再是公开的固定回退值）
    jwtSecret: secret ?? randomBytes(32).toString('hex'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    dbPath: process.env.DB_PATH ?? './data/shoreops.db',
    corsOrigin,
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
    isProduction
  }
}

export const config = loadConfig()
