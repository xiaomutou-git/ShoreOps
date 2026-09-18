/**
 * @file 倒排规划算法单元测试
 * @description 验证模板选择、作战星期映射、buildPlan 产出与级联顺延的正确性。
 * 创建时间：2026-09-18
 */
import { describe, expect, it } from 'vitest'
import {
  availableWeekdays,
  buildPlan,
  cascadeShift,
  getTemplates
} from '@/utils/planner'

describe('倒排规划 planner', () => {
  it('三种求职类型模板长度正确', () => {
    expect(getTemplates('social')).toHaveLength(7)
    expect(getTemplates('campus')).toHaveLength(7)
    expect(getTemplates('transition')).toHaveLength(8)
  })

  it('每周作战天数映射到正确星期集合', () => {
    expect(availableWeekdays(6)).toEqual([1, 2, 3, 4, 5, 6])
    expect(availableWeekdays(7)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(availableWeekdays(1)).toEqual([1])
  })

  it('社招 buildPlan 产出 7 个里程碑、19 个任务、3 个 MIT', () => {
    const result = buildPlan({
      goalId: 'g1',
      dDay: '2026-12-11',
      type: 'social',
      weeklyAvailableDays: 6,
      startDate: '2026-09-18'
    })
    expect(result.milestones).toHaveLength(7)
    expect(result.tasks).toHaveLength(19)
    expect(result.tasks.filter((t) => t.isMIT)).toHaveLength(3)
    expect(result.milestones[0].status).toBe('ongoing')
  })

  it('里程碑日期等于 D-Day 减去偏移天数', () => {
    const result = buildPlan({
      goalId: 'g1',
      dDay: '2026-12-11',
      type: 'social',
      weeklyAvailableDays: 6,
      startDate: '2026-09-18'
    })
    // 首个里程碑 offset=84
    expect(result.milestones[0].plannedDate).toBe('2026-09-18')
    // 最后一个里程碑 offset=0 = D-Day
    expect(result.milestones[6].plannedDate).toBe('2026-12-11')
  })

  it('D-Day 早于开始日时抛错', () => {
    expect(() =>
      buildPlan({
        goalId: 'g1',
        dDay: '2026-09-01',
        type: 'social',
        weeklyAvailableDays: 6,
        startDate: '2026-09-18'
      })
    ).toThrow()
  })

  it('cascadeShift 将触发点及之后里程碑顺延 7 天', () => {
    const plan = buildPlan({
      goalId: 'g1',
      dDay: '2026-12-11',
      type: 'social',
      weeklyAvailableDays: 6,
      startDate: '2026-09-18'
    })
    const triggerId = plan.milestones[3].id
    const originalDate = plan.milestones[3].plannedDate
    const beforeDate = plan.milestones[2].plannedDate
    const shifted = cascadeShift(plan.milestones, plan.tasks, triggerId, 7)

    expect(shifted.milestones[3].plannedDate).not.toBe(originalDate)
    // 触发点之前的里程碑不变
    expect(shifted.milestones[2].plannedDate).toBe(beforeDate)
  })

  it('每日产能约束：2h 下首日总任务 ≤96 分钟（原240分钟问题已修复）', () => {
    const result = buildPlan({
      goalId: 'g1',
      dDay: '2026-12-11',
      type: 'social',
      weeklyAvailableDays: 6,
      dailyCapacityHours: 2,
      startDate: '2026-09-18'
    })
    const firstTotal = result.tasks
      .filter((t) => t.dueDate === '2026-09-18')
      .reduce((sum, t) => sum + t.estimateMinutes, 0)
    expect(firstTotal).toBeLessThanOrEqual(96)
  })

  it('每日产能越小首日承载越少：1h 下 ≤48 分钟', () => {
    const result = buildPlan({
      goalId: 'g1',
      dDay: '2026-12-11',
      type: 'social',
      weeklyAvailableDays: 6,
      dailyCapacityHours: 1,
      startDate: '2026-09-18'
    })
    const firstTotal = result.tasks
      .filter((t) => t.dueDate === '2026-09-18')
      .reduce((sum, t) => sum + t.estimateMinutes, 0)
    expect(firstTotal).toBeLessThanOrEqual(48)
  })
})
