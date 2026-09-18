/**
 * @file IndexedDB 数据访问层（Dexie 封装）
 * @description 定义数据库 schema、单例连接、默认设置与首次初始化（含成就进度记录）。
 * 设计思路：Local-First，所有写操作走事务；提供默认设置工厂与软删兼容。
 * 创建时间：2026-09-18
 */
import Dexie, { type Table } from 'dexie'
import type {
  Application,
  DailyReview,
  Goal,
  Interview,
  InterviewReview,
  KnowledgeItem,
  Milestone,
  MoodLog,
  Settings,
  StageEvent,
  Task,
  UserAchievement,
  UserProfile
} from '@/types'
import { uid } from '@/utils/id'
import { ACHIEVEMENT_DEFS } from '@/data/achievements'

/** 默认设置记录的固定主键（单例） */
export const SETTINGS_ID = 'settings-singleton'

/**
 * 默认设置工厂
 *
 * @returns {Settings} 初始化用的默认设置对象
 */
export function createDefaultSettings(): Settings {
  return {
    theme: 'light',
    fontSize: 'normal',
    reduceMotion: false,
    soundOn: false,
    planReminderTime: '08:30',
    reviewReminderTime: '21:00',
    stagnationRules: {
      appliedWarn: 5,
      appliedDanger: 10,
      postInterview: 7
    },
    restCouponsLeft: 1
  }
}

/**
 * 上岸作战室数据库类
 * 核心用途：声明全部业务表与索引版本，作为全局唯一数据连接。
 * 适用场景：所有组件/仓库通过此类的单例进行读写，禁止重复 new Dexie。
 */
export class ShoreOpsDatabase extends Dexie {
  /** 用户档案表 */
  profiles!: Table<UserProfile, string>
  /** 战役目标表 */
  goals!: Table<Goal, string>
  /** 里程碑表 */
  milestones!: Table<Milestone, string>
  /** 作战任务表 */
  tasks!: Table<Task, string>
  /** 申请（公司机会）表 */
  applications!: Table<Application, string>
  /** 阶段流转事件表 */
  stageEvents!: Table<StageEvent, string>
  /** 面试表 */
  interviews!: Table<Interview, string>
  /** 面试复盘表 */
  interviewReviews!: Table<InterviewReview, string>
  /** 每日复盘表 */
  dailyReviews!: Table<DailyReview, string>
  /** 能量日记表 */
  moodLogs!: Table<MoodLog, string>
  /** 知识弹药表 */
  knowledgeItems!: Table<KnowledgeItem, string>
  /** 用户成就表 */
  userAchievements!: Table<UserAchievement, string>
  /** 设置表（单例，主键固定） */
  settings!: Table<Settings, string>

  /**
   * 构造函数：定义 schema 版本与索引
   */
  constructor() {
    super('shoreops')
    this.version(1).stores({
      profiles: 'id, identity, jobSearchType',
      goals: 'id, dDay, status',
      milestones: 'id, goalId, plannedDate, status, order',
      tasks: 'id, milestoneId, applicationId, dueDate, status, type, isMIT',
      applications: 'id, currentStage, enteredStageAt, companyName',
      stageEvents: 'id, applicationId, eventDate, toStage',
      interviews: 'id, applicationId, scheduledAt, status',
      interviewReviews: 'id, interviewId',
      dailyReviews: 'id, date',
      moodLogs: 'id, date, energy',
      knowledgeItems: 'id, type, mastery, nextReviewAt',
      userAchievements: 'id, achievementCode, unlockedAt',
      settings: 'id'
    })
  }
}

/** 全局数据库单例 */
export const db = new ShoreOpsDatabase()

/**
 * 初始化应用数据
 * 执行逻辑：若无设置记录则写入默认设置；若无用户成就记录则按定义生成占位进度。
 * 依赖条件：IndexedDB 可用。
 *
 * @returns {Promise<Settings>} 当前生效的设置对象
 * @throws {Error} 当数据库读写失败时抛出，调用方应 try-catch 并进入降级提示。
 */
export async function initDatabase(): Promise<Settings> {
  try {
    let settings = await db.settings.get(SETTINGS_ID)
    if (!settings) {
      settings = createDefaultSettings()
      await db.settings.put(settings, SETTINGS_ID)
    }
    const achievementCount = await db.userAchievements.count()
    if (achievementCount === 0) {
      const ts = new Date().toISOString()
      const records: UserAchievement[] = ACHIEVEMENT_DEFS.map((def) => ({
        id: uid(),
        achievementCode: def.code,
        unlockedAt: null,
        progress: 0,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
      }))
      await db.userAchievements.bulkAdd(records)
    }
    return settings
  } catch (err) {
    // 数据库不可用时返回内存默认设置，避免白屏；持久化功能在 UI 中提示
    return createDefaultSettings()
  }
}

/**
 * 读取当前设置
 *
 * @returns {Promise<Settings>} 设置对象；不存在时返回默认值
 */
export async function getSettings(): Promise<Settings> {
  try {
    const settings = await db.settings.get(SETTINGS_ID)
    return settings ?? createDefaultSettings()
  } catch (err) {
    return createDefaultSettings()
  }
}

/**
 * 保存设置
 *
 * @param {Settings} settings - 待持久化的设置
 * @returns {Promise<void>} 写入完成
 * @throws {Error} 写库失败时抛出
 */
export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put(settings, SETTINGS_ID)
}
