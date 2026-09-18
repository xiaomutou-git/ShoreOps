/**
 * @file 作战计划状态（里程碑 + 任务）
 * @description 加载/缓存里程碑与任务，提供今日三垒、打卡、Streak 计算、任务增删改与顺延。
 * 设计思路：内存中派生今日视图与连续天数；写操作同步 IndexedDB 并更新审计字段。
 * 创建时间：2026-09-18
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Milestone,
  MilestoneStatus,
  Task,
  TaskStatus
} from '@/types'
import { db } from '@/db/database'
import { uid } from '@/utils/id'
import { addDays, todayISO } from '@/utils/date'

/** 新建任务的最小字段集合 */
export type NewTaskInput = Partial<Task> & { title: string }

/**
 * 收集已完成任务的作战日期集合（含休整类型）
 *
 * @param {Task[]} tasks - 全部任务
 * @returns {Set<string>} 作战日期集合
 */
function collectDoneDates(tasks: Task[]): Set<string> {
  const set = new Set<string>()
  tasks.forEach((t) => {
    if (t.status === 'done' && t.completedAt) {
      set.add(t.completedAt.slice(0, 10))
    }
  })
  return set
}

/**
 * 计算截至今天的连续作战天数（含宽限：今天未打卡则从昨天起算）
 *
 * @param {Task[]} tasks - 全部任务
 * @returns {number} 连续天数
 */
export function computeStreak(tasks: Task[]): number {
  const dates = collectDoneDates(tasks)
  const today = todayISO()
  let cursor = dates.has(today) ? today : addDays(today, -1)
  let count = 0
  while (dates.has(cursor)) {
    count += 1
    cursor = addDays(cursor, -1)
  }
  return count
}

/**
 * 作战计划 Store
 * 核心用途：统管里程碑与任务的内存状态及持久化动作。
 */
export const usePlanStore = defineStore('plan', () => {
  /** 全部里程碑 */
  const milestones = ref<Milestone[]>([])
  /** 全部任务 */
  const tasks = ref<Task[]>([])
  /** 当前查看日期（默认今天） */
  const currentDate = ref(todayISO())

  /** 今日三垒（未完成优先） */
  const todayMIT = computed(() =>
    tasks.value
      .filter((t) => t.dueDate === currentDate.value && t.isMIT)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 3)
  )

  /** 今日其他任务 */
  const todayOther = computed(() =>
    tasks.value
      .filter((t) => t.dueDate === currentDate.value && !t.isMIT)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  )

  /** 逾期未完成任务 */
  const overdueTasks = computed(() =>
    tasks.value.filter(
      (t) =>
        t.dueDate < currentDate.value &&
        t.status !== 'done' &&
        t.status !== 'skipped'
    )
  )

  /** 今日完成数 */
  const todayDoneCount = computed(
    () =>
      tasks.value.filter(
        (t) => t.dueDate === currentDate.value && t.status === 'done'
      ).length
  )

  /** 今日任务总数 */
  const todayTotal = computed(
    () => tasks.value.filter((t) => t.dueDate === currentDate.value).length
  )

  /** 连续作战天数 */
  const streak = computed(() => computeStreak(tasks.value))

  /** 本周作战率（基于已完成日期在本周的占比） */
  const weekRate = computed(() => {
    const dates = collectDoneDates(tasks.value)
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    let done = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      if (dates.has(`${y}-${m}-${day}`)) done += 1
    }
    return { done, total: 7 }
  })

  /**
   * 计算里程碑完成率
   *
   * @param {string} milestoneId - 里程碑 id
   * @returns {number} 0-1
   */
  function milestoneCompletion(milestoneId: string): number {
    const linked = tasks.value.filter((t) => t.milestoneId === milestoneId)
    if (linked.length === 0) return 0
    return linked.filter((t) => t.status === 'done').length / linked.length
  }

  /**
   * 根据日期刷新里程碑显示状态（内存派生，过期标记 overdue）
   *
   * @returns {void}
   */
  function refreshMilestoneStatus(): void {
    const today = currentDate.value
    milestones.value.forEach((m) => {
      if (m.status === 'done' || m.status === 'missed') return
      if (m.plannedDate < today) {
        m.status = 'overdue' as MilestoneStatus
      }
    })
  }

  /**
   * 从数据库加载指定战役的里程碑与任务
   *
   * @param {string} goalId - 战役 id
   * @returns {Promise<void>}
   */
  async function loadAll(goalId: string): Promise<void> {
    try {
      milestones.value = await db.milestones
        .where('goalId')
        .equals(goalId)
        .sortBy('order')
      tasks.value = await db.tasks.toArray()
      refreshMilestoneStatus()
    } catch (err) {
      throw new Error('作战计划加载失败')
    }
  }

  /**
   * 直接用已构建的实体填充内存（创建战役后使用）
   *
   * @param {Milestone[]} ms - 里程碑
   * @param {Task[]} ts - 任务
   * @returns {void}
   */
  function hydrate(ms: Milestone[], ts: Task[]): void {
    milestones.value = ms
    tasks.value = ts
    refreshMilestoneStatus()
  }

  /**
   * 切换任务完成状态（打卡/取消）
   *
   * @param {string} taskId - 任务 id
   * @returns {Promise<void>}
   */
  async function toggleTask(taskId: string): Promise<void> {
    const target = tasks.value.find((t) => t.id === taskId)
    if (!target) return
    try {
      const now = new Date().toISOString()
      if (target.status !== 'done') {
        target.status = 'done' as TaskStatus
        target.completedAt = now
      } else {
        target.status = 'todo' as TaskStatus
        target.completedAt = null
      }
      target.updatedAt = now
      await db.tasks.put(target)
    } catch (err) {
      throw new Error('打卡失败，请重试')
    }
  }

  /**
   * 设置/取消任务的今日三垒标记（MIT 最多 3 个）
   *
   * @param {string} taskId - 任务 id
   * @param {boolean} value - 是否置顶
   * @returns {Promise<void>}
   */
  async function setMIT(taskId: string, value: boolean): Promise<void> {
    const target = tasks.value.find((t) => t.id === taskId)
    if (!target) return
    try {
      if (value) {
        const currentCount = tasks.value.filter(
          (t) => t.isMIT && t.dueDate === currentDate.value
        ).length
        if (currentCount >= 3 && !target.isMIT) return
      }
      target.isMIT = value
      target.updatedAt = new Date().toISOString()
      await db.tasks.put(target)
    } catch (err) {
      throw new Error('三垒调整失败')
    }
  }

  /**
   * 顺延任务到明天（每日上限 3 次）
   *
   * @param {string} taskId - 任务 id
   * @returns {Promise<void>}
   */
  async function snoozeTask(taskId: string): Promise<void> {
    const target = tasks.value.find((t) => t.id === taskId)
    if (!target || target.snoozeCount >= 3) return
    try {
      target.dueDate = addDays(currentDate.value, 1)
      target.snoozeCount += 1
      target.updatedAt = new Date().toISOString()
      await db.tasks.put(target)
    } catch (err) {
      throw new Error('顺延失败')
    }
  }

  /**
   * 新增任务
   *
   * @param {NewTaskInput} input - 任务字段
   * @returns {Promise<Task>} 创建后的任务
   */
  async function addTask(input: NewTaskInput): Promise<Task> {
    try {
      const ts = new Date().toISOString()
      const task: Task = {
        id: uid(),
        milestoneId: input.milestoneId ?? null,
        applicationId: input.applicationId ?? null,
        knowledgeItemIds: input.knowledgeItemIds ?? [],
        title: input.title,
        type: input.type ?? 'study',
        priority: input.priority ?? 'medium',
        estimateMinutes: input.estimateMinutes ?? 30,
        dueDate: input.dueDate ?? currentDate.value,
        status: 'todo',
        completedAt: null,
        repeatRule: input.repeatRule ?? { type: 'none' },
        sortOrder: input.sortOrder ?? tasks.value.length,
        note: input.note ?? '',
        snoozeCount: 0,
        isMIT: input.isMIT ?? false,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
      }
      await db.tasks.add(task)
      tasks.value.push(task)
      return task
    } catch (err) {
      throw new Error('任务新增失败')
    }
  }

  /**
   * 更新任务字段
   *
   * @param {string} taskId - 任务 id
   * @param {Partial<Task>} patch - 字段补丁
   * @returns {Promise<void>}
   */
  async function updateTask(taskId: string, patch: Partial<Task>): Promise<void> {
    const target = tasks.value.find((t) => t.id === taskId)
    if (!target) return
    try {
      Object.assign(target, patch, { updatedAt: new Date().toISOString() })
      await db.tasks.put(target)
    } catch (err) {
      throw new Error('任务更新失败')
    }
  }

  /**
   * 删除任务（软删后从内存移除）
   *
   * @param {string} taskId - 任务 id
   * @returns {Promise<void>}
   */
  async function removeTask(taskId: string): Promise<void> {
    try {
      await db.tasks.delete(taskId)
      tasks.value = tasks.value.filter((t) => t.id !== taskId)
    } catch (err) {
      throw new Error('任务删除失败')
    }
  }

  return {
    milestones,
    tasks,
    currentDate,
    todayMIT,
    todayOther,
    overdueTasks,
    todayDoneCount,
    todayTotal,
    streak,
    weekRate,
    milestoneCompletion,
    loadAll,
    hydrate,
    toggleTask,
    setMIT,
    snoozeTask,
    addTask,
    updateTask,
    removeTask
  }
})
