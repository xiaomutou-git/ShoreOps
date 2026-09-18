<!--
  视图：ReviewView 复盘作战室
  核心功能：每日收工三问（推进/卡点/明日MIT）；数据洞察（关键 KPI 与规则瓶颈诊断）。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { useFunnelStore } from '@/stores/funnel'
import { useEnergyStore } from '@/stores/energy'
import { db } from '@/db/database'
import { todayISO } from '@/utils/date'
import { uid as makeUid } from '@/utils/id'
import type { DailyReview } from '@/types'
import Icon from '@/components/Icon.vue'

/** 计划 */
const planStore = usePlanStore()
/** 漏斗 */
const funnelStore = useFunnelStore()
/** 能量 */
const energyStore = useEnergyStore()

/** 当前 Tab */
const tab = ref<'daily' | 'insight'>('daily')
/** 三问表单 */
const form = ref({ progress: '', blockers: '', tomorrowMIT: '' })
/** Toast */
const toast = ref('')
/** 今日是否已复盘 */
const saved = ref(false)

/**
 * 加载今日复盘与各模块数据
 *
 * @returns {Promise<void>}
 */
onMounted(async () => {
  try {
    await Promise.all([funnelStore.loadAll(), energyStore.loadAll()])
    const existing = await db.dailyReviews
      .where('date')
      .equals(todayISO())
      .first()
    if (existing) {
      form.value = {
        progress: existing.progress,
        blockers: existing.blockers,
        tomorrowMIT: existing.tomorrowMIT
      }
      saved.value = true
    }
  } catch (err) {
    toast.value = '加载失败'
  }
})

/** KPI 列表 */
const kpis = computed(() => [
  { label: '在管申请', value: funnelStore.applications.length, icon: 'funnel' },
  { label: '当前 Offer', value: funnelStore.stageCounts.offer, icon: 'star' },
  { label: '连续作战', value: planStore.streak, icon: 'flame' },
  { label: '今日完成率', value: planStore.todayTotal ? Math.round((planStore.todayDoneCount / planStore.todayTotal) * 100) + '%' : '0%', icon: 'target' }
])

/**
 * 规则瓶颈诊断（仅在有数据时显示，带口径）
 */
const diagnoses = computed(() => {
  const list: Array<{ title: string; basis: string; action: string }> = []
  const s = funnelStore.stats
  if (s.hasEnoughSamples && s.appliedToWritten < 0.1) {
    list.push({
      title: '简历通过率偏低',
      basis: `已投→笔试 ${Math.round(s.appliedToWritten * 100)}%（基于终态样本）`,
      action: '针对岗位定制简历，强化 STAR 量化结果'
    })
  }
  if (s.hasEnoughSamples && s.interviewToOffer === 0) {
    list.push({
      title: '面试转化为 0',
      basis: '已进入面试但未获 Offer',
      action: '复盘表达与岗位匹配，增加模拟面试'
    })
  }
  if (energyStore.continuousLow) {
    list.push({
      title: '连续 3 天低能量',
      basis: '近 3 天能量均 ≤2',
      action: '启用一键休整，优先恢复精力'
    })
  }
  return list
})

/**
 * 保存每日复盘
 *
 * @returns {Promise<void>}
 */
async function save(): Promise<void> {
  try {
    const ts = new Date().toISOString()
    const existing = await db.dailyReviews.where('date').equals(todayISO()).first()
    if (existing) {
      await db.dailyReviews.put({ ...existing, ...form.value, updatedAt: ts })
    } else {
      const review: DailyReview = {
        id: makeUid(),
        date: todayISO(),
        ...form.value,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null
      }
      await db.dailyReviews.add(review)
    }
    saved.value = true
    toast.value = '复盘已保存'
    window.setTimeout(() => (toast.value = ''), 2000)
  } catch (err) {
    toast.value = '保存失败'
  }
}
</script>

<template>
  <div class="page-container review-view">
    <h1 class="page-title">复盘作战室</h1>

    <div class="tabs" role="tablist">
      <button role="tab" class="tab" :class="{ active: tab === 'daily' }" @click="tab = 'daily'">每日三问</button>
      <button role="tab" class="tab" :class="{ active: tab === 'insight' }" @click="tab = 'insight'">数据洞察</button>
    </div>

    <!-- 每日三问 -->
    <section v-if="tab === 'daily'" class="card daily-card">
      <label class="q-item">
        <span class="q-label">① 今天推进了什么？</span>
        <textarea v-model="form.progress" class="field" rows="3" :placeholder="`已完成 ${planStore.todayDoneCount} 件任务`"></textarea>
      </label>
      <label class="q-item">
        <span class="q-label">② 最大的卡点是什么？</span>
        <textarea v-model="form.blockers" class="field" rows="3" placeholder="时间不够 / 某类题不会 / 状态不好"></textarea>
      </label>
      <label class="q-item">
        <span class="q-label">③ 明天最重要的一件事？</span>
        <textarea v-model="form.tomorrowMIT" class="field" rows="2" placeholder="将作为明日首要任务候选"></textarea>
      </label>
      <button class="btn-primary" @click="save">{{ saved ? '更新复盘' : '完成今日复盘' }}</button>
    </section>

    <!-- 数据洞察 -->
    <section v-else class="insight">
      <div class="kpi-grid">
        <div v-for="k in kpis" :key="k.label" class="kpi-card card">
          <Icon :name="k.icon" :size="20" class="kpi-icon" />
          <p class="kpi-value num">{{ k.value }}</p>
          <p class="kpi-label">{{ k.label }}</p>
        </div>
      </div>

      <h2 class="block-title">瓶颈诊断</h2>
      <div class="diag-list">
        <article v-for="d in diagnoses" :key="d.title" class="diag-card card">
          <h3 class="diag-title">{{ d.title }}</h3>
          <p class="diag-basis muted">{{ d.basis }}</p>
          <p class="diag-action">{{ d.action }}</p>
        </article>
        <p v-if="!diagnoses.length" class="empty-hint">暂无明显瓶颈，样本或数据积累中将持续诊断</p>
      </div>
    </section>

    <Transition name="fade-slide">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.review-view { display: flex; flex-direction: column; gap: var(--space-5); }
.tabs { display: flex; gap: var(--space-2); border-bottom: 1px solid var(--color-border); }
.tab { padding: var(--space-2) var(--space-4); color: var(--color-gray-500); font-size: 14px; border-bottom: 2px solid transparent; }
.tab.active { color: var(--color-gray-900); border-bottom-color: var(--color-primary-hover); font-weight: 500; }
.daily-card { display: flex; flex-direction: column; gap: var(--space-5); }
.q-item { display: flex; flex-direction: column; gap: var(--space-2); }
.q-label { font-size: 14px; font-weight: 500; color: var(--color-gray-700); }
.kpi-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: var(--space-4); }
@media (min-width:768px){ .kpi-grid { grid-template-columns: repeat(4,1fr); } }
.kpi-card { display: flex; flex-direction: column; gap: var(--space-2); }
.kpi-icon { color: var(--color-primary-hover); }
.kpi-value { font-size: 26px; font-weight: 700; }
.kpi-label { font-size: 13px; color: var(--color-text-tertiary); }
.block-title { font-size: 16px; font-weight: 600; }
.diag-list { display: flex; flex-direction: column; gap: var(--space-3); }
.diag-card { display: flex; flex-direction: column; gap: var(--space-2); }
.diag-title { font-size: 15px; font-weight: 600; }
.diag-action { font-size: 14px; color: var(--color-primary-active); }
.empty-hint { font-size: 13px; color: var(--color-text-tertiary); text-align: center; padding: var(--space-6); }
.toast { position: fixed; top: var(--space-3); left: 50%; transform: translateX(-50%); padding: var(--space-3) var(--space-5); background: var(--color-gray-800); color: #fff; border-radius: var(--radius-md); font-size: 13px; z-index: var(--z-toast); }
</style>
