/**
 * @file 士气能量状态（心情日记）
 * @description 记录每日能量与情绪、补记近 3 天，派生今日状态、近期序列与连续低能量检测。
 * 创建时间：2026-09-18
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { EmotionTag, MoodLog } from '@/types'
import { db } from '@/db/database'
import { uid } from '@/utils/id'
import { addDays, todayISO } from '@/utils/date'

/** 记录能量的参数 */
export interface RecordMoodPayload {
  /** 日期（默认今天，允许近 3 天） */
  date?: string
  /** 能量 1-5 */
  energy: number
  /** 情绪标签 */
  emotions: EmotionTag[]
  /** 一句话日记 */
  note?: string
}

/**
 * 士气能量 Store
 * 核心用途：管理能量日记读写与低能量预警。
 */
export const useEnergyStore = defineStore('energy', () => {
  /** 全部能量日记 */
  const moodLogs = ref<MoodLog[]>([])

  /** 今日能量记录 */
  const todayMood = computed(
    () => moodLogs.value.find((m) => m.date === todayISO()) ?? null
  )

  /** 近 14 天记录（按日期升序，含空缺） */
  const recent14 = computed(() => {
    const result: Array<{ date: string; energy: number | null }> = []
    for (let i = 13; i >= 0; i--) {
      const date = addDays(todayISO(), -i)
      result.push({
        date,
        energy: moodLogs.value.find((m) => m.date === date)?.energy ?? null
      })
    }
    return result
  })

  /** 是否连续 3 天低能量（≤2） */
  const continuousLow = computed(() => {
    const days = [0, 1, 2].map((i) =>
      moodLogs.value.find((m) => m.date === addDays(todayISO(), -i))
    )
    return days.every((m) => m && m.energy <= 2)
  })

  /**
   * 加载全部能量日记
   *
   * @returns {Promise<void>}
   */
  async function loadAll(): Promise<void> {
    try {
      moodLogs.value = await db.moodLogs.toArray()
    } catch (err) {
      throw new Error('能量记录加载失败')
    }
  }

  /**
   * 记录或更新某日能量（按日期唯一）
   *
   * @param {RecordMoodPayload} payload - 能量记录参数
   * @returns {Promise<MoodLog>} 保存后的记录
   * @throws {Error} 落库失败时抛出
   */
  async function recordMood(payload: RecordMoodPayload): Promise<MoodLog> {
    try {
      const date = payload.date ?? todayISO()
      const existing = moodLogs.value.find((m) => m.date === date)
      const ts = new Date().toISOString()
      if (existing) {
        existing.energy = payload.energy
        existing.emotions = payload.emotions
        existing.note = payload.note ?? existing.note
        existing.updatedAt = ts
        await db.moodLogs.put(existing)
        return existing
      }
      const log: MoodLog = {
        id: uid(),
        date,
        energy: payload.energy,
        emotions: payload.emotions,
        note: payload.note ?? '',
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
      }
      await db.moodLogs.add(log)
      moodLogs.value.push(log)
      return log
    } catch (err) {
      throw new Error('能量记录保存失败')
    }
  }

  return {
    moodLogs,
    todayMood,
    recent14,
    continuousLow,
    loadAll,
    recordMood
  }
})
