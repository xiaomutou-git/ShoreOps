<!--
  视图：FunnelView 申请漏斗看板
  核心功能：阶段筛选、在池/转化率统计、申请卡换列、关闭与事件时间线详情。
  交互：桌面多信息列表；阶段切换用 select（键盘/无障碍友好，作为拖拽替代）。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useFunnelStore, evaluateStagnation } from '@/stores/funnel'
import { useAppStore } from '@/stores/app'
import type { Application, FunnelStage } from '@/types'
import ApplicationFormModal from '@/components/ApplicationFormModal.vue'
import Icon from '@/components/Icon.vue'

/** 漏斗 */
const funnelStore = useFunnelStore()
/** 应用（预警规则） */
const appStore = useAppStore()

/** 表单模态 */
const formShow = ref(false)
/** 编辑目标 */
const editing = ref<Application | null>(null)
/** 详情申请 */
const detailApp = ref<Application | null>(null)
/** Toast */
const toast = ref('')

/** 阶段筛选选项 */
const filterOptions: Array<{ value: FunnelStage | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'wishlist', label: '意向' },
  { value: 'applied', label: '已投递' },
  { value: 'written', label: '笔试' },
  { value: 'interview', label: '面试' },
  { value: 'offer', label: 'Offer' },
  { value: 'closed', label: '已结束' }
]

/** 仅含真实阶段（去掉 all），用于统计条安全索引 */
const stageOnlyOptions = computed(() =>
  filterOptions.filter(
    (o): o is { value: FunnelStage; label: string } => o.value !== 'all'
  )
)

/** 当前筛选下的申请 */
const visibleApps = computed(() => {
  const list = funnelStore.applications.slice().sort((a, b) =>
    a.enteredStageAt < b.enteredStageAt ? 1 : -1
  )
  if (funnelStore.filterStage === 'all') return list
  return list.filter((a) => a.currentStage === funnelStore.filterStage)
})

/**
 * 获取预警信息
 *
 * @param {Application} app - 申请
 * @returns {{ days:number; level:string }}
 */
function stagnation(app: Application): { days: number; level: string } {
  const rules =
    appStore.settings?.stagnationRules ?? {
      appliedWarn: 5,
      appliedDanger: 10,
      postInterview: 7
    }
  return evaluateStagnation(app, rules)
}

/**
 * 加载
 *
 * @returns {Promise<void>}
 */
onMounted(async () => {
  try {
    await funnelStore.loadAll()
  } catch (err) {
    toast.value = '加载失败'
  }
})

/**
 * 阶段切换
 *
 * @param {Application} app - 申请
 * @param {Event} event - change 事件
 * @returns {Promise<void>}
 */
async function onStageChange(app: Application, event: Event): Promise<void> {
  const value = (event.target as HTMLSelectElement).value as FunnelStage
  try {
    await funnelStore.moveStage(app.id, value)
  } catch (err) {
    toast.value = '阶段更新失败'
  }
}

/**
 * 关闭申请
 *
 * @param {string} id - 申请 id
 * @returns {Promise<void>}
 */
async function onClose(id: string): Promise<void> {
  try {
    await funnelStore.closeApplication(id, 'rejected')
    toast.value = '已关闭'
  } catch (err) {
    toast.value = '关闭失败'
  }
}

/**
 * 保存申请
 *
 * @param {{ companyName:string; positionTitle:string; channel:Application['channel']; jdUrl:string; salaryMin:number; salaryMax:number }} payload - 字段
 * @returns {Promise<void>}
 */
async function onSave(payload: {
  companyName: string
  positionTitle: string
  channel: Application['channel']
  jdUrl: string
  salaryMin: number
  salaryMax: number
}): Promise<void> {
  try {
    if (editing.value) {
      await funnelStore.updateApplication(editing.value.id, {
        companyName: payload.companyName,
        positionTitle: payload.positionTitle,
        channel: payload.channel,
        jdUrl: payload.jdUrl,
        salary: { min: payload.salaryMin, max: payload.salaryMax }
      })
    } else {
      await funnelStore.addApplication(payload)
    }
    formShow.value = false
  } catch (err) {
    toast.value = '保存失败'
  }
}

/** 转化率百分比格式化 */
function pct(v: number): string {
  return Math.round(v * 100) + '%'
}
</script>

<template>
  <div class="page-container funnel-view">
    <header class="funnel-header">
      <h1 class="page-title">漏斗看板</h1>
      <button class="btn-primary" @click="editing = null; formShow = true">
        <Icon name="plus" :size="16" /> 新增申请
      </button>
    </header>

    <!-- 统计 -->
    <section class="stats-bar card">
      <div class="stage-pills">
        <span v-for="o in stageOnlyOptions" :key="o.value" class="stage-pill">
          <span class="pill-count num">{{ funnelStore.stageCounts[o.value] }}</span>
          {{ o.label }}
        </span>
      </div>
      <div v-if="funnelStore.stats.hasEnoughSamples" class="conversions">
        <span>投→笔 <b class="num">{{ pct(funnelStore.stats.appliedToWritten) }}</b></span>
        <span>笔→面 <b class="num">{{ pct(funnelStore.stats.writtenToInterview) }}</b></span>
        <span>面→Offer <b class="num">{{ pct(funnelStore.stats.interviewToOffer) }}</b></span>
        <span>投→Offer <b class="num">{{ pct(funnelStore.stats.appliedToOffer) }}</b></span>
      </div>
      <p v-else class="muted sample-hint">终态样本不足 5 个，转化率统计积累中</p>
    </section>

    <!-- 筛选 -->
    <div class="filter-row" role="group" aria-label="阶段筛选">
      <button
        v-for="o in filterOptions"
        :key="o.value"
        class="filter-chip"
        :class="{ active: funnelStore.filterStage === o.value }"
        @click="funnelStore.filterStage = o.value"
      >
        {{ o.label }}
      </button>
    </div>

    <!-- 申请列表 -->
    <div class="app-list">
      <article v-for="app in visibleApps" :key="app.id" class="app-card card">
        <div class="app-top">
          <div class="avatar">{{ app.companyName.slice(0, 1) }}</div>
          <div class="app-id">
            <h2 class="company">{{ app.companyName }}</h2>
            <p class="position">{{ app.positionTitle }}</p>
          </div>
          <span
            v-if="app.currentStage !== 'closed'"
            class="stay-chip"
            :class="stagnation(app).level"
          >
            {{ stagnation(app).days }} 天
          </span>
        </div>

        <div class="app-actions">
          <label class="stage-select-label">
            <span class="sr-only">更新阶段</span>
            <select
              class="stage-select"
              :value="app.currentStage"
              @change="onStageChange(app, $event)"
            >
              <option v-for="s in funnelStore.STAGES" :key="s" :value="s">
                {{ { wishlist:'意向', applied:'已投递', written:'笔试', interview:'面试', offer:'Offer', closed:'已结束' }[s] }}
              </option>
            </select>
          </label>
          <button class="btn-text" @click="detailApp = app">
            <Icon name="clock" :size="14" /> 时间线
          </button>
          <button class="btn-text" @click="editing = app; formShow = true">
            <Icon name="edit" :size="14" /> 编辑
          </button>
          <button
            v-if="app.currentStage !== 'closed'"
            class="btn-text close-text"
            @click="onClose(app.id)"
          >
            <Icon name="x" :size="14" /> 关闭
          </button>
        </div>
      </article>

      <p v-if="!visibleApps.length" class="empty-hint">该阶段暂无申请</p>
    </div>

    <!-- 时间线详情 -->
    <Teleport to="body">
      <div v-if="detailApp" class="overlay" @click.self="detailApp = null">
        <div class="detail-panel" role="dialog" aria-modal="true" aria-label="事件时间线">
          <div class="detail-head">
            <h3>{{ detailApp.companyName }} · 时间线</h3>
            <button aria-label="关闭" @click="detailApp = null"><Icon name="x" :size="18" /></button>
          </div>
          <ol class="event-list">
            <li v-for="(e, i) in funnelStore.timelineOf(detailApp.id)" :key="i" class="event">
              <span class="event-date num">{{ e.eventDate }}</span>
              <span class="event-text">
                {{ { wishlist:'意向', applied:'已投递', written:'笔试', interview:'面试', offer:'Offer', closed:'已结束' }[e.toStage] }}
                <em v-if="e.note"> · {{ e.note }}</em>
              </span>
            </li>
          </ol>
        </div>
      </div>
    </Teleport>

    <ApplicationFormModal
      :show="formShow"
      :application="editing"
      @close="formShow = false"
      @save="onSave"
    />

    <Transition name="fade-slide">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.funnel-view { display: flex; flex-direction: column; gap: var(--space-5); }
.funnel-header { display: flex; align-items: center; justify-content: space-between; }
.stats-bar { display: flex; flex-direction: column; gap: var(--space-3); }
.stage-pills { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.stage-pill { display: inline-flex; align-items: center; gap: var(--space-1); font-size: 13px; color: var(--color-gray-600); }
.pill-count { font-size: 18px; font-weight: 700; color: var(--color-gray-900); }
.conversions { display: flex; flex-wrap: wrap; gap: var(--space-4); font-size: 13px; color: var(--color-gray-600); padding-top: var(--space-3); border-top: 1px solid var(--color-border); }
.sample-hint { padding-top: var(--space-2); }
.filter-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.filter-chip { padding: var(--space-1) var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--color-border); background: var(--color-surface-2); color: var(--color-gray-600); font-size: 13px; }
.filter-chip.active { background: var(--color-cyan-50); border-color: var(--color-primary-hover); color: var(--color-primary-active); }
.app-list { display: flex; flex-direction: column; gap: var(--space-3); }
.app-card { display: flex; flex-direction: column; gap: var(--space-3); }
.app-top { display: flex; align-items: center; gap: var(--space-3); }
.avatar { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--color-cyan-50); color: var(--color-primary-active); border-radius: var(--radius-md); font-weight: 600; }
.app-id { flex: 1; min-width: 0; }
.company { font-size: 15px; font-weight: 600; }
.position { font-size: 13px; color: var(--color-gray-600); }
.stay-chip { padding: 2px var(--space-2); border-radius: var(--radius-sm); font-size: 12px; background: var(--color-gray-50); color: var(--color-gray-600); }
.stay-chip.warn { background: var(--color-warning-bg); color: var(--color-warning-text); }
.stay-chip.danger { background: var(--color-danger-bg); color: var(--color-danger-text); }
.app-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.stage-select { height: 32px; padding: 0 var(--space-2); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); background: #fff; font-size: 13px; }
.close-text { color: var(--color-danger-text); }
.empty-hint { font-size: 13px; color: var(--color-text-tertiary); text-align: center; padding: var(--space-6); }
.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding: var(--space-4); background: rgba(18,24,29,.45); backdrop-filter: blur(2px); z-index: var(--z-modal); }
.detail-panel { width: 100%; max-width: 440px; max-height: 80vh; overflow-y: auto; background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }
.detail-head { display: flex; align-items: center; justify-content: space-between; padding: var(--space-5); color: var(--color-gray-500); }
.event-list { padding: 0 var(--space-5) var(--space-5); display: flex; flex-direction: column; gap: var(--space-3); }
.event { display: flex; flex-direction: column; gap: 2px; padding-left: var(--space-3); border-left: 2px solid var(--color-primary); }
.event-date { font-size: 12px; color: var(--color-text-tertiary); }
.event-text { font-size: 14px; color: var(--color-gray-800); }
.toast { position: fixed; top: var(--space-3); left: 50%; transform: translateX(-50%); padding: var(--space-3) var(--space-5); background: var(--color-gray-800); color: #fff; border-radius: var(--radius-md); font-size: 13px; z-index: var(--z-toast); }
</style>
