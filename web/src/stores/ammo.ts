/**
 * @file 知识弹药状态
 * @description 管理题库/错题/话术/STAR/情报的读写、标签筛选、间隔重复复习与战备统计。
 * 设计思路：间隔重复阶段 0-4，间隔天数 1/3/7/15/30；复习推进自动更新掌握度与下次日期。
 * 创建时间：2026-09-18
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  KnowledgeItem,
  KnowledgeType,
  Mastery
} from '@/types'
import { db } from '@/db/database'
import { uid } from '@/utils/id'
import { addDays, todayISO } from '@/utils/date'

/** 间隔重复各阶段间隔天数 */
export const REVIEW_INTERVALS = [1, 3, 7, 15, 30]

/** 新建弹药字段集合 */
export type NewKnowledgeInput = Partial<KnowledgeItem> & {
  title: string
  type: KnowledgeType
}

/**
 * 由复习阶段推导掌握度
 *
 * @param {number} stage - 0-4
 * @returns {Mastery} 掌握度
 */
function masteryFromStage(stage: number): Mastery {
  if (stage >= 4) return 'mastered'
  if (stage > 0) return 'reviewing'
  return 'new'
}

/**
 * 知识弹药 Store
 * 核心用途：统管弹药 CRUD、今日待复习与战备值。
 */
export const useAmmoStore = defineStore('ammo', () => {
  /** 全部弹药 */
  const knowledgeItems = ref<KnowledgeItem[]>([])
  /** 类型筛选（'all' 表示全部） */
  const filterType = ref<KnowledgeType | 'all'>('all')
  /** 搜索关键字 */
  const keyword = ref('')

  /** 经过类型与关键字过滤的弹药 */
  const filteredItems = computed(() =>
    knowledgeItems.value.filter((item) => {
      const typeOk =
        filterType.value === 'all' || item.type === filterType.value
      const kw = keyword.value.trim().toLowerCase()
      const kwOk =
        !kw ||
        item.title.toLowerCase().includes(kw) ||
        item.content.toLowerCase().includes(kw)
      return typeOk && kwOk
    })
  )

  /** 今日待复习（nextReviewAt ≤ 今天） */
  const dueReviews = computed(() =>
    knowledgeItems.value.filter(
      (item) => item.nextReviewAt && item.nextReviewAt <= todayISO()
    )
  )

  /** 战备值：弹药总数 */
  const totalCount = computed(() => knowledgeItems.value.length)

  /** 各掌握度数量 */
  const masteryCounts = computed(() => {
    const counts = { new: 0, reviewing: 0, mastered: 0 }
    knowledgeItems.value.forEach((i) => {
      counts[i.mastery] += 1
    })
    return counts
  })

  /**
   * 加载全部弹药
   *
   * @returns {Promise<void>}
   */
  async function loadAll(): Promise<void> {
    try {
      knowledgeItems.value = await db.knowledgeItems.toArray()
    } catch (err) {
      throw new Error('弹药库加载失败')
    }
  }

  /**
   * 推进一次间隔重复复习
   *
   * @param {string} id - 弹药 id
   * @returns {Promise<void>}
   */
  async function advanceReview(id: string): Promise<void> {
    const target = knowledgeItems.value.find((i) => i.id === id)
    if (!target) return
    try {
      const nextStage = Math.min(target.reviewStage + 1, 4)
      target.reviewStage = nextStage
      target.mastery = masteryFromStage(nextStage)
      target.nextReviewAt = addDays(todayISO(), REVIEW_INTERVALS[nextStage])
      target.updatedAt = new Date().toISOString()
      await db.knowledgeItems.put(target)
    } catch (err) {
      throw new Error('复习进度更新失败')
    }
  }

  /**
   * 新增弹药
   *
   * @param {NewKnowledgeInput} input - 弹药字段
   * @returns {Promise<KnowledgeItem>} 创建后的弹药
   */
  async function addKnowledge(
    input: NewKnowledgeInput
  ): Promise<KnowledgeItem> {
    try {
      const ts = new Date().toISOString()
      const today = todayISO()
      const item: KnowledgeItem = {
        id: uid(),
        type: input.type,
        title: input.title,
        content: input.content ?? '',
        starFields: input.starFields ?? null,
        tags: input.tags ?? [],
        mastery: input.mastery ?? 'new',
        sourceApplicationId: input.sourceApplicationId ?? null,
        nextReviewAt:
          input.type === 'question' ? addDays(today, REVIEW_INTERVALS[0]) : null,
        reviewStage: input.reviewStage ?? 0,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
      }
      await db.knowledgeItems.add(item)
      knowledgeItems.value.push(item)
      return item
    } catch (err) {
      throw new Error('弹药新增失败')
    }
  }

  /**
   * 更新弹药字段
   *
   * @param {string} id - 弹药 id
   * @param {Partial<KnowledgeItem>} patch - 字段补丁
   * @returns {Promise<void>}
   */
  async function updateKnowledge(
    id: string,
    patch: Partial<KnowledgeItem>
  ): Promise<void> {
    const target = knowledgeItems.value.find((i) => i.id === id)
    if (!target) return
    try {
      Object.assign(target, patch, { updatedAt: new Date().toISOString() })
      await db.knowledgeItems.put(target)
    } catch (err) {
      throw new Error('弹药更新失败')
    }
  }

  /**
   * 删除弹药
   *
   * @param {string} id - 弹药 id
   * @returns {Promise<void>}
   */
  async function removeKnowledge(id: string): Promise<void> {
    try {
      await db.knowledgeItems.delete(id)
      knowledgeItems.value = knowledgeItems.value.filter((i) => i.id !== id)
    } catch (err) {
      throw new Error('弹药删除失败')
    }
  }

  return {
    knowledgeItems,
    filterType,
    keyword,
    filteredItems,
    dueReviews,
    totalCount,
    masteryCounts,
    loadAll,
    advanceReview,
    addKnowledge,
    updateKnowledge,
    removeKnowledge
  }
})
