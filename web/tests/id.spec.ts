/**
 * @file ID 工具单元测试
 * @description 验证 uid 唯一性与格式。
 * 创建时间：2026-09-18
 */
import { describe, expect, it } from 'vitest'
import { uid } from '@/utils/id'

describe('ID 工具 id', () => {
  it('连续生成 100 个 id 互不重复', () => {
    const set = new Set<string>()
    for (let i = 0; i < 100; i++) set.add(uid())
    expect(set.size).toBe(100)
  })

  it('生成的 id 为非空字符串', () => {
    const id = uid()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
})
