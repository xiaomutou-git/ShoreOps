/**
 * @file 日期工具单元测试
 * @description 验证日期偏移、间隔、星期与格式化函数。
 * 创建时间：2026-09-18
 */
import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysBetween,
  formatCN,
  isWeekend,
  parseISODate,
  toISODate,
  weekdayOf
} from '@/utils/date'

describe('日期工具 date', () => {
  it('toISODate 与 parseISODate 互逆', () => {
    expect(toISODate(parseISODate('2026-09-18'))).toBe('2026-09-18')
  })

  it('addDays 正确偏移（含跨月）', () => {
    expect(addDays('2026-09-18', 7)).toBe('2026-09-25')
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-09-18', -18)).toBe('2026-08-31')
  })

  it('daysBetween 计算整数差', () => {
    expect(daysBetween('2026-09-18', '2026-09-28')).toBe(10)
    expect(daysBetween('2026-09-28', '2026-09-18')).toBe(-10)
  })

  it('weekdayOf：2026-09-18 为周五（5）', () => {
    expect(weekdayOf('2026-09-18')).toBe(5)
  })

  it('isWeekend 正确识别周末', () => {
    expect(isWeekend('2026-09-19')).toBe(true)
    expect(isWeekend('2026-09-18')).toBe(false)
  })

  it('formatCN 输出中文日期', () => {
    expect(formatCN('2026-09-18')).toBe('9月18日 周五')
  })
})
