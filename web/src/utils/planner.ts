/**
 * @file D-Day 倒排作战规划算法（产品核心）
 * @description 依据求职类型与目标登陆日，套用内置里程碑模板倒排生成里程碑，并将标准任务包
 *              按"每周可作战天数"均匀摊排到各作战日；同时处理错过节点压缩与级联顺延。
 * 设计思路：纯函数、可离线、可单测；不修改入参，只产出新实体。
 * 创建时间：2026-09-18
 */
import type {
  JobSearchType,
  Milestone,
  MilestonePhase,
  Priority,
  Task,
  TaskType
} from '@/types'
import { uid } from './id'
import { addDays, parseISODate, todayISO, weekdayOf } from './date'

/** 单个标准任务模板 */
export interface TaskTemplate {
  /** 任务标题 */
  title: string
  /** 任务类型 */
  type: TaskType
  /** 优先级 */
  priority: Priority
  /** 预估分钟 */
  estimateMinutes: number
}

/** 单个里程碑模板 */
export interface MilestoneTemplate {
  /** 模板键 */
  key: string
  /** 标题 */
  title: string
  /** 战役阶段 */
  phase: MilestonePhase
  /** 相对 D-Day 偏移天数（D-x） */
  offset: number
  /** 关键交付物 */
  deliverable: string
  /** 标准任务包 */
  taskPack: TaskTemplate[]
}

/** 生成计划的输入参数 */
export interface BuildPlanInput {
  /** 所属战役 id */
  goalId: string
  /** D-Day 日期 yyyy-mm-dd */
  dDay: string
  /** 求职类型 */
  type: JobSearchType
  /** 每周可作战天数 1-7 */
  weeklyAvailableDays: number
  /** 每日可投入时长（小时，默认 2）；用于按产能约束每日任务量 */
  dailyCapacityHours?: number
  /** 战役开始日（默认今天） */
  startDate?: string
}

/**
 * 社招里程碑模板（约 12 周，滚动招聘）
 */
const SOCIAL_TEMPLATES: MilestoneTemplate[] = [
  {
    key: 'm0',
    title: '战役启动 · 定位准备',
    phase: 'prepare',
    offset: 84,
    deliverable: '确定目标岗位/城市/薪资底线，完成简历 V1',
    taskPack: [
      { title: '明确目标岗位与3家标杆公司JD', type: 'study', priority: 'high', estimateMinutes: 60 },
      { title: '完成简历 V1（含联系方式）', type: 'resume', priority: 'high', estimateMinutes: 120 },
      { title: '梳理个人技能与项目清单', type: 'resume', priority: 'medium', estimateMinutes: 60 }
    ]
  },
  {
    key: 'm1',
    title: '弹药就位',
    phase: 'assets',
    offset: 70,
    deliverable: '作品集、自我介绍话术、3 个 STAR 项目故事定稿',
    taskPack: [
      { title: '打磨 30 秒 / 2 分钟自我介绍', type: 'interview', priority: 'high', estimateMinutes: 60 },
      { title: '写 3 个 STAR 项目故事并量化结果', type: 'resume', priority: 'high', estimateMinutes: 120 },
      { title: '准备期望薪资与离职原因话术', type: 'interview', priority: 'medium', estimateMinutes: 45 }
    ]
  },
  {
    key: 'm2',
    title: '投递启动',
    phase: 'apply',
    offset: 63,
    deliverable: '建立 30 家目标公司清单，首批投递 10 家',
    taskPack: [
      { title: '整理 30 家目标公司清单', type: 'apply', priority: 'high', estimateMinutes: 60 },
      { title: '首批投递 10 家定制简历', type: 'apply', priority: 'high', estimateMinutes: 120 },
      { title: '完善漏斗看板并记录投递', type: 'apply', priority: 'medium', estimateMinutes: 30 }
    ]
  },
  {
    key: 'm3',
    title: '笔试 / 初面期',
    phase: 'written',
    offset: 49,
    deliverable: '累计投递 ≥30，进入笔面节奏',
    taskPack: [
      { title: '累计投递至 30 家', type: 'apply', priority: 'high', estimateMinutes: 120 },
      { title: '刷高频专业题 20 道', type: 'drill', priority: 'high', estimateMinutes: 120 },
      { title: '完成 1 次模拟面试', type: 'interview', priority: 'medium', estimateMinutes: 60 }
    ]
  },
  {
    key: 'm4',
    title: '面试密集期',
    phase: 'interview',
    offset: 28,
    deliverable: '每周 ≥3 场面试，高频复盘',
    taskPack: [
      { title: '安排每周 ≥3 场面试', type: 'interview', priority: 'high', estimateMinutes: 60 },
      { title: '每场面试 24h 内结构化复盘', type: 'review', priority: 'high', estimateMinutes: 45 },
      { title: '针对短板专项补强', type: 'study', priority: 'medium', estimateMinutes: 90 }
    ]
  },
  {
    key: 'm5',
    title: 'Offer 收割与谈判',
    phase: 'offer',
    offset: 14,
    deliverable: '拿到首个 Offer，启动谈薪',
    taskPack: [
      { title: '准备谈薪话术与市场行情对标', type: 'interview', priority: 'high', estimateMinutes: 60 },
      { title: '整理 Offer 多维对比表', type: 'review', priority: 'high', estimateMinutes: 45 }
    ]
  },
  {
    key: 'm6',
    title: '决策上岸',
    phase: 'offer',
    offset: 0,
    deliverable: '对比 Offer 并确认接受',
    taskPack: [
      { title: '确认并接受最终 Offer', type: 'apply', priority: 'high', estimateMinutes: 30 },
      { title: '生成完整战役总结', type: 'review', priority: 'medium', estimateMinutes: 30 }
    ]
  }
]

/**
 * 校招里程碑模板（锚定秋招批次）
 */
const CAMPUS_TEMPLATES: MilestoneTemplate[] = [
  {
    key: 'c0',
    title: '提前批准备',
    phase: 'prepare',
    offset: 77,
    deliverable: '简历定稿、目标公司批次时间表',
    taskPack: [
      { title: '完成校招简历并请人把关', type: 'resume', priority: 'high', estimateMinutes: 120 },
      { title: '整理目标公司网申时间表', type: 'apply', priority: 'high', estimateMinutes: 60 }
    ]
  },
  {
    key: 'c1',
    title: '弹药就位',
    phase: 'assets',
    offset: 63,
    deliverable: '自我介绍、项目故事、八股基础',
    taskPack: [
      { title: '准备校招自我介绍话术', type: 'interview', priority: 'high', estimateMinutes: 60 },
      { title: '写 3 个校园/实习 STAR 故事', type: 'resume', priority: 'high', estimateMinutes: 120 }
    ]
  },
  {
    key: 'c2',
    title: '正式批网申',
    phase: 'apply',
    offset: 49,
    deliverable: '完成正式批密集网申',
    taskPack: [
      { title: '每周投递 15 家正式批', type: 'apply', priority: 'high', estimateMinutes: 120 },
      { title: '网申信息表快速复用', type: 'apply', priority: 'medium', estimateMinutes: 30 }
    ]
  },
  {
    key: 'c3',
    title: '统一笔试周',
    phase: 'written',
    offset: 35,
    deliverable: '应对各公司笔试与在线测评',
    taskPack: [
      { title: '刷算法/专业笔试题 30 道', type: 'drill', priority: 'high', estimateMinutes: 180 },
      { title: '练习行测与性格测评', type: 'drill', priority: 'low', estimateMinutes: 60 }
    ]
  },
  {
    key: 'c4',
    title: '多轮面试期',
    phase: 'interview',
    offset: 21,
    deliverable: '完成群面/技术面/HR 面',
    taskPack: [
      { title: '准备群面框架与角色话术', type: 'interview', priority: 'high', estimateMinutes: 90 },
      { title: '每场面试后结构化复盘', type: 'review', priority: 'high', estimateMinutes: 45 }
    ]
  },
  {
    key: 'c5',
    title: 'Offer 收割',
    phase: 'offer',
    offset: 10,
    deliverable: '拿到并比对多个 Offer',
    taskPack: [
      { title: '整理 Offer 对比与三方流程', type: 'review', priority: 'high', estimateMinutes: 60 }
    ]
  },
  {
    key: 'c6',
    title: '决策上岸',
    phase: 'offer',
    offset: 0,
    deliverable: '确认 Offer、签署三方',
    taskPack: [{ title: '确认接受 Offer', type: 'apply', priority: 'high', estimateMinutes: 30 }]
  }
]

/**
 * 转行里程碑模板（准备期加长约 16 周）
 */
const TRANSITION_TEMPLATES: MilestoneTemplate[] = [
  {
    key: 't0',
    title: '目标岗位调研',
    phase: 'prepare',
    offset: 112,
    deliverable: '明确目标岗位能力模型与技能差距',
    taskPack: [
      { title: '访谈 3 位目标岗位从业者', type: 'network', priority: 'high', estimateMinutes: 90 },
      { title: '拆解 10 份目标岗位 JD 能力项', type: 'study', priority: 'high', estimateMinutes: 90 }
    ]
  },
  {
    key: 't1',
    title: '知识体系补课',
    phase: 'prepare',
    offset: 98,
    deliverable: '系统补齐核心知识与工具',
    taskPack: [
      { title: '完成核心课程/证书学习', type: 'study', priority: 'high', estimateMinutes: 240 },
      { title: '输出学习笔记 10 篇', type: 'study', priority: 'medium', estimateMinutes: 120 }
    ]
  },
  {
    key: 't2',
    title: '迁移经历翻译',
    phase: 'assets',
    offset: 84,
    deliverable: '把旧经历改写为新岗位语言与作品',
    taskPack: [
      { title: '用 STAR 翻译 5 个迁移经历', type: 'resume', priority: 'high', estimateMinutes: 150 },
      { title: '完成 1 个目标岗位实战作品', type: 'study', priority: 'high', estimateMinutes: 240 }
    ]
  },
  {
    key: 't3',
    title: '投递启动',
    phase: 'apply',
    offset: 56,
    deliverable: '建立清单并启动首批投递',
    taskPack: [
      { title: '整理 25 家友好公司清单', type: 'apply', priority: 'high', estimateMinutes: 60 },
      { title: '首批投递 8 家并定制简历', type: 'apply', priority: 'high', estimateMinutes: 120 }
    ]
  },
  {
    key: 't4',
    title: '笔试初面',
    phase: 'written',
    offset: 42,
    deliverable: '应对笔试与转行故事追问',
    taskPack: [
      { title: '打磨"为什么转行"2 分钟话术', type: 'interview', priority: 'high', estimateMinutes: 60 },
      { title: '刷目标岗位专业题 20 道', type: 'drill', priority: 'medium', estimateMinutes: 120 }
    ]
  },
  {
    key: 't5',
    title: '面试密集期',
    phase: 'interview',
    offset: 28,
    deliverable: '高频面试与复盘',
    taskPack: [
      { title: '每周 ≥2 场面试并复盘', type: 'review', priority: 'high', estimateMinutes: 90 },
      { title: '针对项目深度追问补强', type: 'study', priority: 'medium', estimateMinutes: 90 }
    ]
  },
  {
    key: 't6',
    title: 'Offer 收割谈判',
    phase: 'offer',
    offset: 14,
    deliverable: '拿到转行首个 Offer',
    taskPack: [{ title: '谈薪并对比 Offer', type: 'interview', priority: 'high', estimateMinutes: 60 }]
  },
  {
    key: 't7',
    title: '决策上岸',
    phase: 'offer',
    offset: 0,
    deliverable: '接受 Offer 完成转行',
    taskPack: [{ title: '确认接受 Offer', type: 'apply', priority: 'high', estimateMinutes: 30 }]
  }
]

/**
 * 根据求职类型获取对应模板集合
 *
 * @param {JobSearchType} type - 求职类型
 * @returns {MilestoneTemplate[]} 按时间先后（offset 从大到小）排列的模板
 */
export function getTemplates(type: JobSearchType): MilestoneTemplate[] {
  if (type === 'campus') return CAMPUS_TEMPLATES
  if (type === 'transition') return TRANSITION_TEMPLATES
  return SOCIAL_TEMPLATES
}

/**
 * 由"每周可作战天数"推导可作战的星期集合
 * 映射规则：优先保留周一至周六，天数越少越向周初收敛（周日仅在 7 天时包含）。
 *
 * @param {number} weeklyAvailableDays - 1-7
 * @returns {number[]} 可作战星期（0-6）
 */
export function availableWeekdays(weeklyAvailableDays: number): number[] {
  const n = Math.min(7, Math.max(1, weeklyAvailableDays))
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order.slice(0, n).sort((a, b) => a - b)
}

/**
 * 收集区间 [start, end] 内的所有作战日
 *
 * @param {string} start - 起始日期（含）
 * @param {string} end - 结束日期（含）
 * @param {number[]} weekdays - 可作战星期集合
 * @returns {string[]} 升序作战日列表
 */
export function collectWorkingDays(start: string, end: string, weekdays: number[]): string[] {
  const result: string[] = []
  let cursor = start
  let guard = 0
  const maxIter =
    Math.round(
      (parseISODate(end).getTime() - parseISODate(start).getTime()) / 86400000
    ) + 2
  while (cursor <= end && guard <= maxIter) {
    if (weekdays.includes(weekdayOf(cursor))) {
      result.push(cursor)
    }
    cursor = addDays(cursor, 1)
    guard += 1
  }
  return result
}

/**
 * 生成当前 ISO 时间戳
 *
 * @returns {string} ISO 时间字符串
 */
function nowTS(): string {
  return new Date().toISOString()
}

/**
 * 依据输入倒排构建里程碑与任务（核心入口）
 * 执行逻辑：
 *  1. 取模板，里程碑日期 = dDay - offset；
 *  2. 早于开始日的里程碑标记为 missed，其任务压缩到开始日后 1-7 天；
 *  3. 正常里程碑的任务包均匀摊入"上一里程碑 ~ 当前里程碑"区间内作战日；
 *  4. 最近的 3 个任务标记为今日三垒（isMIT）。
 *
 * @param {BuildPlanInput} input - 计划输入参数
 * @returns {{ milestones: Milestone[]; tasks: Task[] }} 可直接持久化的实体集合
 * @throws {Error} 当 dDay 早于开始日等非法输入时抛出
 */
export function buildPlan(input: BuildPlanInput): {
  milestones: Milestone[]
  tasks: Task[]
} {
  const startDate = input.startDate ?? todayISO()
  if (input.dDay < startDate) {
    throw new Error('D-Day 不能早于战役开始日')
  }
  const templates = getTemplates(input.type)
  const weekdays = availableWeekdays(input.weeklyAvailableDays)
  const ts = nowTS()

  const milestones: Milestone[] = templates.map((tpl, index) => {
    const plannedDate = addDays(input.dDay, -tpl.offset)
    const missed = plannedDate < startDate
    return {
      id: uid(),
      goalId: input.goalId,
      title: tpl.title,
      phase: tpl.phase,
      plannedDate,
      actualDate: null,
      offsetFromDDay: tpl.offset,
      status: missed ? 'missed' : index === 0 ? 'ongoing' : 'pending',
      order: index,
      source: 'template',
      deliverable: tpl.deliverable,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null
    }
  })

  const tasks: Task[] = []
  let sortOrder = 0
  templates.forEach((tpl, index) => {
    const milestone = milestones[index]
    const prevDate = index === 0 ? startDate : milestones[index - 1].plannedDate
    const intervalStart = prevDate < startDate ? startDate : prevDate
    const intervalEnd = milestone.plannedDate < startDate ? startDate : milestone.plannedDate

    let workingDays = collectWorkingDays(intervalStart, intervalEnd, weekdays)
    if (workingDays.length === 0) {
      workingDays = [intervalEnd]
    }

    tpl.taskPack.forEach((t, j) => {
      let dueDate: string
      if (milestone.status === 'missed') {
        // 错过节点：任务压缩进开始日后 1-7 天
        dueDate = addDays(startDate, (j % 7) + 1)
      } else if (tpl.taskPack.length === 1) {
        dueDate = workingDays[workingDays.length - 1]
      } else {
        const pos = Math.floor(
          (j * (workingDays.length - 1)) / (tpl.taskPack.length - 1)
        )
        dueDate = workingDays[pos]
      }
      tasks.push({
        id: uid(),
        milestoneId: milestone.id,
        applicationId: null,
        knowledgeItemIds: [],
        title: t.title,
        type: t.type,
        priority: t.priority,
        estimateMinutes: t.estimateMinutes,
        dueDate,
        status: 'todo',
        completedAt: null,
        repeatRule: { type: 'none' },
        sortOrder: sortOrder++,
        note: '',
        snoozeCount: 0,
        isMIT: false,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
      })
    })
  })

  // 按每日产能重排：首日留 20% 缓冲，超出产能的任务顺延到后续作战日
  enforceDailyCapacity(
    tasks,
    startDate,
    input.dailyCapacityHours ?? 2,
    weekdays
  )

  // 选取最临近开始日的 3 个未完成任务作为今日三垒
  const earliest = [...tasks]
    .filter((t) => t.status === 'todo')
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
    .slice(0, 3)
  earliest.forEach((t) => {
    t.isMIT = true
  })

  return { milestones, tasks }
}

/**
 * 按"每日可投入产能"对任务进行装箱重排
 * 执行逻辑：从任务原日期起累计当日预估时长，超出产能的任务顺延到下一个有容量的作战日；
 *           首日按 80% 产能缓冲以降低启动阻力。仅重排待办任务，已完成/锁定任务不动。
 *
 * @param {Task[]} tasks - 全部任务（原地更新 dueDate）
 * @param {string} startDate - 战役开始日（首日）
 * @param {number} dailyCapacityHours - 每日可投入小时数
 * @param {number[]} weekdays - 可作战星期集合
 * @returns {Task[]} 重排后的任务集合
 */
export function enforceDailyCapacity(
  tasks: Task[],
  startDate: string,
  dailyCapacityHours: number,
  weekdays: number[]
): Task[] {
  const capacity = Math.max(30, Math.round(dailyCapacityHours * 60))
  /** 各作战日已分配分钟数 */
  const dayLoad = new Map<string, number>()

  // 先按日期、再按优先级（high 先占用当日容量）排序
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const ordered = tasks
    .filter((t) => t.status === 'todo')
    .sort((a, b) =>
      a.dueDate < b.dueDate
        ? -1
        : a.dueDate > b.dueDate
          ? 1
          : priorityOrder[a.priority] - priorityOrder[b.priority]
    )

  ordered.forEach((task) => {
    let cursor = task.dueDate < startDate ? startDate : task.dueDate
    let guard = 0
    let limit = cursor === startDate ? Math.round(capacity * 0.8) : capacity
    let load = dayLoad.get(cursor) ?? 0

    while (load + task.estimateMinutes > limit && guard < 120) {
      cursor = addDays(cursor, 1)
      guard += 1
      // 非作战日不可安排，继续向后寻找
      if (!weekdays.includes(weekdayOf(cursor))) continue
      load = dayLoad.get(cursor) ?? 0
      limit = capacity
    }

    dayLoad.set(cursor, (dayLoad.get(cursor) ?? 0) + task.estimateMinutes)
    if (cursor !== task.dueDate) {
      task.dueDate = cursor
    }
  })

  return tasks
}

/**
 * 将指定里程碑及其后所有未完成里程碑、任务整体顺延（级联）
 *
 * @param {Milestone[]} milestones - 当前全部里程碑
 * @param {Task[]} tasks - 当前全部任务
 * @param {string} milestoneId - 触发顺延的里程碑 id
 * @param {number} shiftDays - 顺延天数（正整数）
 * @returns {{ milestones: Milestone[]; tasks: Task[] }} 顺延后的新集合（已完成任务不动）
 */
export function cascadeShift(
  milestones: Milestone[],
  tasks: Task[],
  milestoneId: string,
  shiftDays: number
): { milestones: Milestone[]; tasks: Task[] } {
  const triggerIndex = milestones.findIndex((m) => m.id === milestoneId)
  if (triggerIndex < 0) {
    return { milestones, tasks }
  }
  const ts = nowTS()
  const newMilestones = milestones.map((m, i) => {
    if (i < triggerIndex || m.status === 'done') return m
    return { ...m, plannedDate: addDays(m.plannedDate, shiftDays), updatedAt: ts }
  })
  const affectedIds = new Set(
    newMilestones
      .filter((_, i) => i >= triggerIndex)
      .map((m) => m.id)
  )
  const newTasks = tasks.map((t) => {
    if (t.milestoneId && affectedIds.has(t.milestoneId) && t.status !== 'done') {
      return { ...t, dueDate: addDays(t.dueDate, shiftDays), updatedAt: ts }
    }
    return t
  })
  return { milestones: newMilestones, tasks: newTasks }
}
