/**
 * @file TaskCard 组件单元测试
 * @description 验证组件渲染与打卡事件。
 * 创建时间：2026-09-18
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskCard from '@/components/TaskCard.vue'
import type { Task } from '@/types'

/** 构造测试用任务 */
function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    milestoneId: null,
    applicationId: null,
    knowledgeItemIds: [],
    title: '写一份简历',
    type: 'resume',
    priority: 'high',
    estimateMinutes: 60,
    dueDate: '2026-09-18',
    status: 'todo',
    completedAt: null,
    repeatRule: { type: 'none' },
    sortOrder: 0,
    note: '',
    snoozeCount: 0,
    isMIT: true,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    ...over
  }
}

describe('TaskCard 组件', () => {
  it('正确渲染任务标题', () => {
    const wrapper = mount(TaskCard, { props: { task: makeTask() } })
    expect(wrapper.text()).toContain('写一份简历')
  })

  it('点击打卡按钮触发 toggle 事件', async () => {
    const wrapper = mount(TaskCard, { props: { task: makeTask() } })
    await wrapper.get('.check-btn').trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')?.[0]).toEqual(['t1'])
  })

  it('完成态卡片带 done 类', () => {
    const wrapper = mount(TaskCard, {
      props: { task: makeTask({ status: 'done' }) }
    })
    expect(wrapper.classes()).toContain('done')
  })
})
