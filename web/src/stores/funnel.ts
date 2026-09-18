/**
 * @file 申请漏斗状态（申请 + 阶段事件）
 * @description 统管申请卡片、拖拽/按钮换列（原子事务+只追加事件）、停留预警与转化率统计。
 * 设计思路：StageEvent 是时间线与转化率唯一事实来源；统计仅基于终态样本，不足时显式提示。
 * 创建时间：2026-09-18
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Application,
  CloseReason,
  FunnelStage,
  FunnelStats,
  StageEvent
} from '@/types'
import { db } from '@/db/database'
import { uid } from '@/utils/id'
import { daysBetween, todayISO } from '@/utils/date'
import { usePlanStore } from './plan'

/** 新建申请的字段集合 */
export type NewApplicationInput = Partial<Application> & {
  companyName: string
  positionTitle: string
}

/** 预警级别 */
export type AlertLevel = 'none' | 'warn' | 'danger'

/** 全部漏斗阶段（顺序固定） */
export const STAGES: FunnelStage[] = [
  'wishlist',
  'applied',
  'written',
  'interview',
  'offer',
  'closed'
]

/**
 * 计算某申请的停留天数与预警级别
 *
 * @param {Application} app - 申请
 * @param {{ appliedWarn:number; appliedDanger:number; postInterview:number }} rules - 预警规则
 * @returns {{ days:number; level:AlertLevel }} 停留天数与级别
 */
export function evaluateStagnation(
  app: Application,
  rules: { appliedWarn: number; appliedDanger: number; postInterview: number }
): { days: number; level: AlertLevel } {
  const days = daysBetween(app.enteredStageAt, todayISO())
  let level: AlertLevel = 'none'
  if (app.currentStage === 'applied') {
    if (days >= rules.appliedDanger) level = 'danger'
    else if (days >= rules.appliedWarn) level = 'warn'
  } else if (app.currentStage === 'written' || app.currentStage === 'interview') {
    if (days >= rules.postInterview) level = 'warn'
  }
  return { days, level }
}

/**
 * 申请漏斗 Store
 * 核心用途：管理申请与事件，提供换列、关闭、统计与预警派生。
 */
export const useFunnelStore = defineStore('funnel', () => {
  /** 全部申请 */
  const applications = ref<Application[]>([])
  /** 全部阶段事件 */
  const stageEvents = ref<StageEvent[]>([])
  /** 看板/列表选中阶段（'all' 表示全部） */
  const filterStage = ref<FunnelStage | 'all'>('all')

  /** 按阶段分组的申请 */
  const applicationsByStage = computed(() => {
    const map = new Map<FunnelStage, Application[]>()
    STAGES.forEach((s) => map.set(s, []))
    applications.value.forEach((a) => {
      map.get(a.currentStage)?.push(a)
    })
    return map
  })

  /** 各阶段在池数量 */
  const stageCounts = computed<Record<FunnelStage, number>>(() => {
    const counts = {
      wishlist: 0,
      applied: 0,
      written: 0,
      interview: 0,
      offer: 0,
      closed: 0
    }
    applications.value.forEach((a) => {
      counts[a.currentStage] += 1
    })
    return counts
  })

  /** 处于预警的申请数 */
  const alertCount = computed(() =>
    applications.value.filter((a) => a.currentStage !== 'closed').length
  )

  /** 某申请的事件时间线 */
  function timelineOf(applicationId: string): StageEvent[] {
    return stageEvents.value
      .filter((e) => e.applicationId === applicationId)
      .sort((a, b) => (a.eventDate < b.eventDate ? -1 : 1))
  }

  /**
   * 基于终态样本计算漏斗转化率
   *
   * @returns {FunnelStats} 统计结果
   */
  const stats = computed<FunnelStats>(() => {
    const closed = applications.value.filter((a) => a.currentStage === 'closed')
    const hasEnoughSamples = closed.length >= 5

    let applied = 0
    let reachedWritten = 0
    let reachedInterview = 0
    let reachedOffer = 0
    let responseDaysSum = 0
    let responseCount = 0

    closed.forEach((app) => {
      const events = stageEvents.value
        .filter((e) => e.applicationId === app.id)
        .sort((a, b) => (a.eventDate < b.eventDate ? -1 : 1))
      const reached = new Set(events.map((e) => e.toStage))
      if (reached.has('applied')) {
        applied += 1
        if (reached.has('written')) {
          reachedWritten += 1
          const appliedAt = events.find((e) => e.toStage === 'applied')?.eventDate
          const writtenAt = events.find((e) => e.toStage === 'written')?.eventDate
          if (appliedAt && writtenAt) {
            responseDaysSum += daysBetween(appliedAt, writtenAt)
            responseCount += 1
          }
        }
        if (reached.has('interview')) reachedInterview += 1
        if (reached.has('offer')) reachedOffer += 1
      }
    })

    return {
      stageCounts: stageCounts.value,
      appliedToWritten: applied ? reachedWritten / applied : 0,
      writtenToInterview: reachedWritten ? reachedInterview / reachedWritten : 0,
      interviewToOffer: reachedInterview ? reachedOffer / reachedInterview : 0,
      appliedToOffer: applied ? reachedOffer / applied : 0,
      avgResponseDays: responseCount ? responseDaysSum / responseCount : 0,
      hasEnoughSamples
    }
  })

  /**
   * 加载全部申请与事件
   *
   * @returns {Promise<void>}
   */
  async function loadAll(): Promise<void> {
    try {
      applications.value = await db.applications.toArray()
      stageEvents.value = await db.stageEvents.toArray()
    } catch (err) {
      throw new Error('漏斗数据加载失败')
    }
  }

  /**
   * 变更申请阶段（原子事务：更新申请 + 追加事件），并可选生成建议任务
   *
   * @param {string} applicationId - 申请 id
   * @param {FunnelStage} toStage - 目标阶段
   * @param {string} note - 备注
   * @param {boolean} createTask - 是否生成建议任务（默认 true）
   * @returns {Promise<void>}
   * @throws {Error} 事务失败时抛出
   */
  async function moveStage(
    applicationId: string,
    toStage: FunnelStage,
    note = '',
    createTask = true
  ): Promise<void> {
    const target = applications.value.find((a) => a.id === applicationId)
    if (!target || target.currentStage === toStage) return
    try {
      const today = todayISO()
      const ts = new Date().toISOString()
      const fromStage = target.currentStage
      const event: StageEvent = {
        id: uid(),
        applicationId,
        fromStage,
        toStage,
        eventDate: today,
        note,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
      }
      await db.transaction(
        'rw',
        db.applications,
        db.stageEvents,
        async () => {
          target.currentStage = toStage
          target.enteredStageAt = today
          target.updatedAt = ts
          if (toStage === 'interview') {
            target.interviewRoundCount += 1
          }
          if (toStage === 'closed' && !target.closeReason) {
            target.closeReason = 'rejected'
          }
          await db.applications.put(target)
          await db.stageEvents.add(event)
        }
      )
      stageEvents.value.push(event)

      if (createTask) {
        const planStore = usePlanStore()
        const taskTitleMap: Partial<Record<FunnelStage, string>> = {
          written: '准备笔试',
          interview: `准备 ${target.companyName} 面试`,
          offer: '谈薪准备与 Offer 对比'
        }
        const title = taskTitleMap[toStage]
        if (title) {
          await planStore.addTask({
            title,
            type: toStage === 'offer' ? 'review' : 'interview',
            priority: 'high',
            dueDate: today,
            applicationId
          })
        }
      }
    } catch (err) {
      throw new Error('阶段更新失败，请重试')
    }
  }

  /**
   * 关闭申请（必须指定原因）
   *
   * @param {string} applicationId - 申请 id
   * @param {CloseReason} reason - 关闭原因
   * @returns {Promise<void>}
   */
  async function closeApplication(
    applicationId: string,
    reason: CloseReason
  ): Promise<void> {
    try {
      const today = todayISO()
      const ts = new Date().toISOString()
      const target = applications.value.find((a) => a.id === applicationId)
      if (!target) return
      const event: StageEvent = {
        id: uid(),
        applicationId,
        fromStage: target.currentStage,
        toStage: 'closed',
        eventDate: today,
        note: reason,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
      }
      await db.transaction(
        'rw',
        db.applications,
        db.stageEvents,
        async () => {
          target.currentStage = 'closed'
          target.closeReason = reason
          target.enteredStageAt = today
          target.updatedAt = ts
          await db.applications.put(target)
          await db.stageEvents.add(event)
        }
      )
      stageEvents.value.push(event)
    } catch (err) {
      throw new Error('申请关闭失败')
    }
  }

  /**
   * 新增申请（默认进入意向阶段）
   *
   * @param {NewApplicationInput} input - 申请字段
   * @returns {Promise<Application>} 创建后的申请
   */
  async function addApplication(
    input: NewApplicationInput
  ): Promise<Application> {
    try {
      const today = todayISO()
      const ts = new Date().toISOString()
      const app: Application = {
        id: uid(),
        companyName: input.companyName,
        positionTitle: input.positionTitle,
        channel: input.channel ?? 'platform',
        jdUrl: input.jdUrl ?? '',
        jdText: input.jdText ?? '',
        contact: input.contact ?? {
          name: '',
          role: '',
          phone: '',
          wechat: '',
          email: ''
        },
        salary: input.salary ?? { min: 0, max: 0 },
        priority: input.priority ?? 'medium',
        currentStage: input.currentStage ?? 'wishlist',
        enteredStageAt: today,
        closeReason: null,
        interviewRoundCount: 0,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
      }
      await db.applications.add(app)
      applications.value.push(app)
      return app
    } catch (err) {
      throw new Error('申请新增失败')
    }
  }

  /**
   * 更新申请字段
   *
   * @param {string} applicationId - 申请 id
   * @param {Partial<Application>} patch - 字段补丁
   * @returns {Promise<void>}
   */
  async function updateApplication(
    applicationId: string,
    patch: Partial<Application>
  ): Promise<void> {
    const target = applications.value.find((a) => a.id === applicationId)
    if (!target) return
    try {
      Object.assign(target, patch, { updatedAt: new Date().toISOString() })
      await db.applications.put(target)
    } catch (err) {
      throw new Error('申请更新失败')
    }
  }

  return {
    applications,
    stageEvents,
    filterStage,
    STAGES,
    applicationsByStage,
    stageCounts,
    alertCount,
    stats,
    timelineOf,
    loadAll,
    moveStage,
    closeApplication,
    addApplication,
    updateApplication
  }
})
