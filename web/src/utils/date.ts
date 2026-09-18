/**
 * @file 日期处理工具
 * @description 提供 Local-First 场景下纯函数式的日期计算：格式化、偏移、间隔、星期与作战日判断。
 * 设计思路：统一以本地时区 "yyyy-mm-dd" 字符串作为日期传输格式，避免 UTC 偏移误差。
 * 创建时间：2026-09-18
 */

/**
 * 将 Date 格式化为本地日期字符串
 *
 * @param {Date} date - 待格式化的 Date 对象
 * @returns {string} "yyyy-mm-dd" 本地日期
 * @throws {TypeError} date 非法时 toISOString 可能异常，已在调用前保证入参有效
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 获取今天的本地日期字符串
 *
 * @returns {string} "yyyy-mm-dd"
 */
export function todayISO(): string {
  return toISODate(new Date())
}

/**
 * 解析 "yyyy-mm-dd" 为本地 Date（零点）
 *
 * @param {string} iso - 日期字符串
 * @returns {Date} 本地零点 Date
 * @throws {Error} 当格式无法解析时抛出
 */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((v) => Number(v))
  if (!y || !m || !d) {
    throw new Error(`非法日期字符串: ${iso}`)
  }
  return new Date(y, m - 1, d)
}

/**
 * 在某日期上偏移整数天，返回新日期字符串
 *
 * @param {string} iso - 基准日期 "yyyy-mm-dd"
 * @param {number} days - 偏移天数，可为负
 * @returns {string} 偏移后的 "yyyy-mm-dd"
 */
export function addDays(iso: string, days: number): string {
  const base = parseISODate(iso)
  base.setDate(base.getDate() + days)
  return toISODate(base)
}

/**
 * 计算两个日期相差的整数天（b - a）
 *
 * @param {string} a - 起始日期
 * @param {string} b - 结束日期
 * @returns {number} b 相对 a 的天数差，b 早于 a 时为负
 */
export function daysBetween(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime()
  return Math.round(ms / 86400000)
}

/**
 * 获取某日是星期几
 *
 * @param {string} iso - 日期字符串
 * @returns {number} 0-6（周日为 0）
 */
export function weekdayOf(iso: string): number {
  return parseISODate(iso).getDay()
}

/**
 * 将日期格式化为中文显示
 *
 * @param {string} iso - 日期字符串
 * @returns {string} 例如 "9月18日 周四"
 */
export function formatCN(iso: string): string {
  const date = parseISODate(iso)
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  return `${date.getMonth() + 1}月${date.getDate()}日 ${week}`
}

/**
 * 判断某日是否为周末
 *
 * @param {string} iso - 日期字符串
 * @returns {boolean} 周六或周日返回 true
 */
export function isWeekend(iso: string): boolean {
  const w = weekdayOf(iso)
  return w === 0 || w === 6
}

/**
 * 在给定的可作战星期集合中，找到不早于基准日的下一个作战日
 *
 * @param {string} iso - 基准日期
 * @param {number[]} availableWeekdays - 可作战的星期集合（0-6）
 * @returns {string} 下一个作战日 "yyyy-mm-dd"
 */
export function nextAvailableDay(iso: string, availableWeekdays: number[]): string {
  let cursor = iso
  let guard = 0
  while (!availableWeekdays.includes(weekdayOf(cursor)) && guard < 8) {
    cursor = addDays(cursor, 1)
    guard += 1
  }
  return cursor
}
