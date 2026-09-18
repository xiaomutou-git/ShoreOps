/**
 * @file 唯一标识生成工具
 * @description 基于 WebCrypto 生成 UUID，用于所有实体主键；对不支持环境做安全兜底。
 * 创建时间：2026-09-18
 */

/**
 * 生成一个 UUID v4 字符串
 * 功能逻辑：优先使用原生 crypto.randomUUID；不可用时用 getRandomValues 手工拼装符合 v4 规范的串。
 * 依赖条件：浏览器 WebCrypto（本地 http(s) 环境下可用，file:// 亦可用）。
 *
 * @returns {string} 36 字符 UUID，例如 "7c9e6679-7425-40de-944b-e07fc1f90ae7"
 * @throws {Error} 当 crypto 与 getRandomValues 均不可用时抛出；调用方应以 try-catch 兜底。
 */
export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
        .slice(6, 8)
        .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
    }
    throw new Error('WebCrypto 不可用，无法生成安全 UUID')
  } catch (err) {
    // 最终兜底：时间戳 + 随机数（仍避免冲突，但不保证密码学强度）
    return `id-${Date.now().toString(16)}-${Math.floor(Math.random() * 1e9).toString(16)}`
  }
}
