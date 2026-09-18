/**
 * @file 全局应用状态（设置 / 档案 / 战役目标）
 * @description 负责应用初始化、设置读写并同步到 document、目标战役的创建与状态切换。
 * 设计思路：Local-First；设置变更即时反映到 <html data-*>，战役创建联动计划仓库。
 * 创建时间：2026-09-18
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Goal, JobSearchType, Settings, UserProfile } from '@/types'
import {
  db,
  getSettings,
  initDatabase,
  saveSettings
} from '@/db/database'
import { uid } from '@/utils/id'
import { todayISO } from '@/utils/date'
import { buildPlan } from '@/utils/planner'
import { usePlanStore } from './plan'

/** 创建战役的表单参数 */
export interface CreateGoalPayload {
  /** 求职类型 */
  type: JobSearchType
  /** D-Day 日期 */
  dDay: string
  /** 目标岗位 */
  position: string
  /** 目标城市 */
  city: string
  /** 每周可作战天数 */
  weeklyAvailableDays: number
  /** 每日可投入小时数 */
  dailyCapacityHours: number
}

/**
 * 全局应用 Store
 * 核心用途：管理设置、用户档案、当前战役目标，并暴露初始化与战役创建动作。
 */
export const useAppStore = defineStore('app', () => {
  /** 当前设置 */
  const settings = ref<Settings | null>(null)
  /** 当前战役目标（null 表示尚未设定） */
  const goal = ref<Goal | null>(null)
  /** 用户档案 */
  const profile = ref<UserProfile | null>(null)
  /** 初始化完成标记 */
  const ready = ref(false)

  /** 是否已建立战役 */
  const hasGoal = computed(() => goal.value !== null)

  /**
   * 将设置应用到 document（字号、减弱动效）
   *
   * @param {Settings} s - 当前设置
   * @returns {void}
   */
  function applySettingsToDocument(s: Settings): void {
    try {
      const root = document.documentElement
      root.dataset.fontsize = s.fontSize
      root.dataset.reduceMotion = s.reduceMotion ? 'true' : undefined
    } catch (err) {
      // document 异常时忽略视觉同步，不影响功能
    }
  }

  /**
   * 初始化应用：加载设置/档案/目标，并生成成就占位
   *
   * @returns {Promise<void>}
   */
  async function init(): Promise<void> {
    try {
      const loaded = await initDatabase()
      settings.value = await getSettings()
      applySettingsToDocument(settings.value ?? loaded)

      profile.value = (await db.profiles.toArray())[0] ?? null
      goal.value = (await db.goals.toArray())[0] ?? null

      if (goal.value) {
        const planStore = usePlanStore()
        await planStore.loadAll(goal.value.id)
      }
    } catch (err) {
      // 初始化失败保持可用（内存态），由 UI 给出离线/异常提示
    } finally {
      ready.value = true
    }
  }

  /**
   * 更新设置并持久化
   *
   * @param {Partial<Settings>} patch - 设置补丁
   * @returns {Promise<void>}
   */
  async function updateSettings(patch: Partial<Settings>): Promise<void> {
    try {
      const next: Settings = {
        ...(settings.value as Settings),
        ...patch
      }
      await saveSettings(next)
      settings.value = next
      applySettingsToDocument(next)
    } catch (err) {
      throw new Error('设置保存失败，请重试')
    }
  }

  /**
   * 创建新战役：写入目标、倒排里程碑与任务
   *
   * @param {CreateGoalPayload} payload - 战役表单
   * @returns {Promise<Goal>} 创建后的目标实体
   * @throws {Error} 当落库或倒排失败时抛出
   */
  async function createGoal(payload: CreateGoalPayload): Promise<Goal> {
    try {
      const ts = new Date().toISOString()
      const newGoal: Goal = {
        id: uid(),
        title: `${payload.position} · 上岸战役`,
        dDay: payload.dDay,
        startDate: todayISO(),
        templateId: payload.type,
        targetBatch: null,
        status: 'active',
        position: payload.position,
        city: payload.city,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
      }
      const plan = buildPlan({
        goalId: newGoal.id,
        dDay: payload.dDay,
        type: payload.type,
        weeklyAvailableDays: payload.weeklyAvailableDays,
        dailyCapacityHours: payload.dailyCapacityHours,
        startDate: newGoal.startDate
      })

      await db.transaction('rw', db.goals, db.milestones, db.tasks, async () => {
        await db.goals.add(newGoal)
        await db.milestones.bulkAdd(plan.milestones)
        await db.tasks.bulkAdd(plan.tasks)
      })

      goal.value = newGoal
      const planStore = usePlanStore()
      planStore.hydrate(plan.milestones, plan.tasks)
      return newGoal
    } catch (err) {
      throw new Error('战役创建失败，请检查日期后重试')
    }
  }

  /**
   * 更新战役状态（暂停/上岸/放弃）
   *
   * @param {Goal['status']} status - 新状态
   * @returns {Promise<void>}
   */
  async function setGoalStatus(status: Goal['status']): Promise<void> {
    if (!goal.value) return
    try {
      const updated: Goal = {
        ...goal.value,
        status,
        updatedAt: new Date().toISOString()
      }
      await db.goals.put(updated)
      goal.value = updated
    } catch (err) {
      throw new Error('战役状态更新失败')
    }
  }

  return {
    settings,
    goal,
    profile,
    ready,
    hasGoal,
    init,
    updateSettings,
    createGoal,
    setGoalStatus
  }
})
