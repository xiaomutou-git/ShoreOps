/**
 * @file 上岸作战室全局类型定义
 * @description 定义产品所有持久化实体、枚举字面量类型与通用结构，是数据库层、状态层、算法层的共同契约。
 * 设计思路：Local-First，全部数据可序列化存入 IndexedDB；时间统一用 ISO 字符串或时间戳。
 * 创建时间：2026-09-18
 */

/** 求职类型：校招 / 社招 / 转行 */
export type JobSearchType = 'campus' | 'social' | 'transition'

/** 求职身份：在校 / 在职 / 离职 */
export type IdentityType = 'student' | 'employed' | 'resigned'

/** 战役状态：备战中 / 暂停 / 已上岸 / 已放弃 */
export type GoalStatus = 'active' | 'paused' | 'landed' | 'abandoned'

/** 里程碑所属战役阶段 */
export type MilestonePhase = 'prepare' | 'assets' | 'apply' | 'written' | 'interview' | 'offer'

/** 里程碑状态 */
export type MilestoneStatus = 'pending' | 'ongoing' | 'done' | 'overdue' | 'missed'

/** 作战任务类型（8 类，含休整） */
export type TaskType =
  | 'apply'
  | 'resume'
  | 'drill'
  | 'interview'
  | 'review'
  | 'study'
  | 'network'
  | 'rest'

/** 任务优先级 */
export type Priority = 'high' | 'medium' | 'low'

/** 任务状态：待办 / 进行中 / 已完成 / 部分完成 / 跳过 */
export type TaskStatus = 'todo' | 'doing' | 'done' | 'partial' | 'skipped'

/** 申请漏斗 6 阶段 */
export type FunnelStage = 'wishlist' | 'applied' | 'written' | 'interview' | 'offer' | 'closed'

/** 申请渠道 */
export type ApplyChannel = 'official' | 'referral' | 'platform' | 'headhunter'

/** 申请关闭原因：接受上岸 / 被拒 / 撤回 / 已读不回 */
export type CloseReason = 'accepted' | 'rejected' | 'withdrawn' | 'ghosted'

/** 面试轮次 */
export type InterviewRound = 'first' | 'second' | 'final' | 'hr' | 'group'

/** 面试形式：线上 / 线下 */
export type InterviewFormat = 'online' | 'onsite'

/** 面试状态 */
export type InterviewStatus = 'scheduled' | 'finished' | 'cancelled'

/** 知识弹药类型：题库 / 错题 / 话术 / STAR 素材 / 公司情报 */
export type KnowledgeType = 'question' | 'mistake' | 'script' | 'star' | 'intel'

/** 掌握度 */
export type Mastery = 'new' | 'reviewing' | 'mastered'

/** 能量情绪标签 */
export type EmotionTag =
  | 'anxious'
  | 'lost'
  | 'tired'
  | 'calm'
  | 'inspired'
  | 'excited'
  | 'wronged'
  | 'angry'

/** 通用审计字段接口（所有表共享） */
export interface AuditFields {
  /** 主键 UUID */
  id: string
  /** 创建时间（ISO 字符串） */
  createdAt: string
  /** 最近更新时间（ISO 字符串） */
  updatedAt: string
  /** 软删除时间，null 表示未删除 */
  deletedAt: string | null
}

/** 薪资区间 */
export interface SalaryRange {
  /** 最小值（单位：千元/月，0 表示未填） */
  min: number
  /** 最大值（单位：千元/月，0 表示未填） */
  max: number
}

/** 用户档案（单例） */
export interface UserProfile extends AuditFields {
  /** 昵称 */
  nickname: string
  /** 求职身份 */
  identity: IdentityType
  /** 求职类型 */
  jobSearchType: JobSearchType
  /** 目标岗位（最多 3 个） */
  targetPositions: string[]
  /** 目标城市 */
  targetCities: string[]
  /** 期望薪资区间 */
  salaryExpect: SalaryRange
  /** 每周可作战天数（1-7，默认 6） */
  weeklyAvailableDays: number
}

/** 战役目标（单例，修改追加版本快照） */
export interface Goal extends AuditFields {
  /** 战役标题 */
  title: string
  /** D-Day 登陆日（ISO 日期 yyyy-mm-dd） */
  dDay: string
  /** 战役开始日（ISO 日期） */
  startDate: string
  /** 使用的模板 id */
  templateId: JobSearchType | 'custom'
  /** 校招目标批次（可空） */
  targetBatch: string | null
  /** 战役状态 */
  status: GoalStatus
  /** 目标岗位 */
  position: string
  /** 目标城市 */
  city: string
}

/** 里程碑 */
export interface Milestone extends AuditFields {
  /** 所属战役 id */
  goalId: string
  /** 里程碑标题 */
  title: string
  /** 所属战役阶段 */
  phase: MilestonePhase
  /** 计划日期（ISO 日期） */
  plannedDate: string
  /** 实际完成日期（可空） */
  actualDate: string | null
  /** 相对 D-Day 的偏移天数（模板锚点，D-x 即 x） */
  offsetFromDDay: number
  /** 里程碑状态 */
  status: MilestoneStatus
  /** 排序序号 */
  order: number
  /** 来源：模板 / 自定义 */
  source: 'template' | 'custom'
  /** 关键交付物描述 */
  deliverable: string
}

/** 重复规则 */
export interface RepeatRule {
  /** 类型：不重复 / 每周指定日 / 间隔天数 */
  type: 'none' | 'weekly' | 'interval'
  /** weekly 时的星期几（0-6，周日为 0） */
  weekdays?: number[]
  /** interval 时的间隔天数 */
  interval?: number
}

/** 作战任务 */
export interface Task extends AuditFields {
  /** 所属里程碑 id（可空，独立任务） */
  milestoneId: string | null
  /** 关联申请公司 id（可空） */
  applicationId: string | null
  /** 关联知识弹药 id 列表 */
  knowledgeItemIds: string[]
  /** 任务标题 */
  title: string
  /** 任务类型 */
  type: TaskType
  /** 优先级 */
  priority: Priority
  /** 预估时长（分钟） */
  estimateMinutes: number
  /** 截止日期（ISO 日期） */
  dueDate: string
  /** 任务状态 */
  status: TaskStatus
  /** 完成时间（可空） */
  completedAt: string | null
  /** 重复规则 */
  repeatRule: RepeatRule
  /** 排序序号 */
  sortOrder: number
  /** 备注 */
  note: string
  /** 顺延次数（上限 3） */
  snoozeCount: number
  /** 是否今日三垒（MIT 置顶） */
  isMIT: boolean
}

/** 联系人信息 */
export interface Contact {
  /** 姓名 */
  name: string
  /** 角色（HR / 内推人 / 面试官） */
  role: string
  /** 电话（加密字段，UI 默认打码） */
  phone: string
  /** 微信（加密字段） */
  wechat: string
  /** 邮箱 */
  email: string
}

/** 申请（公司机会） */
export interface Application extends AuditFields {
  /** 公司名称 */
  companyName: string
  /** 职位名称 */
  positionTitle: string
  /** 渠道 */
  channel: ApplyChannel
  /** JD 链接 */
  jdUrl: string
  /** JD 全文 */
  jdText: string
  /** 联系人 */
  contact: Contact
  /** 薪资区间 */
  salary: SalaryRange
  /** 优先级 */
  priority: Priority
  /** 当前漏斗阶段 */
  currentStage: FunnelStage
  /** 进入当前阶段的时间（ISO 日期） */
  enteredStageAt: string
  /** 关闭原因（可空） */
  closeReason: CloseReason | null
  /** 已进行的面试轮次数 */
  interviewRoundCount: number
}

/** 阶段流转事件（只追加，时间线与转化率唯一事实来源） */
export interface StageEvent extends AuditFields {
  /** 关联申请 id */
  applicationId: string
  /** 原阶段 */
  fromStage: FunnelStage
  /** 目标阶段 */
  toStage: FunnelStage
  /** 事件日期（ISO 日期） */
  eventDate: string
  /** 备注 */
  note: string
}

/** 面试 */
export interface Interview extends AuditFields {
  /** 关联申请 id */
  applicationId: string
  /** 轮次 */
  round: InterviewRound
  /** 计划时间（ISO 字符串） */
  scheduledAt: string
  /** 时长（分钟） */
  durationMinutes: number
  /** 形式 */
  format: InterviewFormat
  /** 地点或会议链接 */
  locationOrLink: string
  /** 面试官角色 */
  interviewerRole: string
  /** 状态 */
  status: InterviewStatus
  /** 关联复盘 id（可空） */
  reviewId: string | null
}

/** 面试题目条目 */
export interface InterviewQuestionEntry {
  /** 题目内容 */
  question: string
  /** 作答表现：好 / 一般 / 砸 */
  performance: 'good' | 'normal' | 'bad'
  /** 转入弹药库后的 id（可空） */
  toKnowledgeId: string | null
}

/** 五维评分（1-5，0 表示未评） */
export interface DimensionScores {
  /** 专业能力 */
  professional: number
  /** 项目深度 */
  project: number
  /** 表达逻辑 */
  expression: number
  /** 岗位匹配 */
  matching: number
  /** 反问互动 */
  interaction: number
}

/** 面试复盘 */
export interface InterviewReview extends AuditFields {
  /** 关联面试 id */
  interviewId: string
  /** 题目清单 */
  questionEntries: InterviewQuestionEntry[]
  /** 五维评分 */
  dimensionScores: DimensionScores
  /** 高光时刻 */
  highlights: string
  /** 暴露短板 */
  weaknesses: string
  /** 结果：通过 / 挂起 / 未通过 */
  result: 'passed' | 'pending' | 'failed'
  /** 失败归因 */
  failReason: string
}

/** 每日复盘（收工三问） */
export interface DailyReview extends AuditFields {
  /** 所属日期（ISO 日期，唯一） */
  date: string
  /** 今天推进了什么 */
  progress: string
  /** 最大卡点 */
  blockers: string
  /** 明日最重要一件事（预填 MIT 草稿） */
  tomorrowMIT: string
}

/** 能量日记 */
export interface MoodLog extends AuditFields {
  /** 所属日期（ISO 日期，唯一） */
  date: string
  /** 能量值 1-5 */
  energy: number
  /** 情绪标签（多选） */
  emotions: EmotionTag[]
  /** 一句话日记 */
  note: string
}

/** STAR 四段结构 */
export interface StarFields {
  /** 情境 */
  situation: string
  /** 任务 */
  task: string
  /** 行动 */
  action: string
  /** 结果 */
  result: string
}

/** 知识弹药 */
export interface KnowledgeItem extends AuditFields {
  /** 弹药类型 */
  type: KnowledgeType
  /** 标题 */
  title: string
  /** 正文（Markdown） */
  content: string
  /** STAR 字段（type=star 时使用） */
  starFields: StarFields | null
  /** 标签 */
  tags: string[]
  /** 掌握度 */
  mastery: Mastery
  /** 来源申请 id（可空） */
  sourceApplicationId: string | null
  /** 下次复习日期（ISO 日期） */
  nextReviewAt: string | null
  /** 间隔重复阶段 0-4 */
  reviewStage: number
}

/** 成就定义（预置） */
export interface AchievementDef {
  /** 成就 code */
  code: string
  /** 名称 */
  name: string
  /** 描述 */
  description: string
  /** 规则目标值 */
  target: number
  /** 图标语义 */
  icon: string
}

/** 用户成就（解锁记录） */
export interface UserAchievement extends AuditFields {
  /** 成就 code */
  achievementCode: string
  /** 解锁时间（可空） */
  unlockedAt: string | null
  /** 当前进度 */
  progress: number
}

/** 停留预警规则配置 */
export interface StagnationRules {
  /** 已投递黄色预警天数（默认 5） */
  appliedWarn: number
  /** 已投递红色预警天数（默认 10） */
  appliedDanger: number
  /** 笔面后预警天数（默认 7） */
  postInterview: number
}

/** 设置（单例） */
export interface Settings {
  /** 主题 */
  theme: 'light' | 'dark'
  /** 字号档位 */
  fontSize: 'normal' | 'lg' | 'xl'
  /** 减弱动效 */
  reduceMotion: boolean
  /** 音效开关 */
  soundOn: boolean
  /** 早计划提醒时间（HH:mm） */
  planReminderTime: string
  /** 晚收工提醒时间（HH:mm） */
  reviewReminderTime: string
  /** 停留预警规则 */
  stagnationRules: StagnationRules
  /** 本周剩余休整券数量 */
  restCouponsLeft: number
}

/** 漏斗转化率统计结果 */
export interface FunnelStats {
  /** 各阶段在池数量 */
  stageCounts: Record<FunnelStage, number>
  /** 已投 → 笔试 转化率（0-1） */
  appliedToWritten: number
  /** 笔试 → 面试 转化率 */
  writtenToInterview: number
  /** 面试 → Offer 转化率 */
  interviewToOffer: number
  /** 已投 → Offer 转化率 */
  appliedToOffer: number
  /** 平均响应天数 */
  avgResponseDays: number
  /** 是否有足够样本（终态 ≥5） */
  hasEnoughSamples: boolean
}
