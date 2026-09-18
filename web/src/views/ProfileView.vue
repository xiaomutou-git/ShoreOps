<!--
  视图：ProfileView 我的
  核心功能：求职档案概览、战役状态管理（暂停/上岸）、本地数据导出/清空、外观设置与隐私说明。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { db } from '@/db/database'
import Icon from '@/components/Icon.vue'

/** 应用 */
const appStore = useAppStore()

/** 各实体条数 */
const counts = ref<Record<string, number>>({})
/** Toast */
const toast = ref('')
/** 清空确认开关 */
const confirmClear = ref(false)
/** 清空勾选 */
const agreed = ref(false)

/** 战役是否暂停 */
const isPaused = computed(() => appStore.goal?.status === 'paused')
/** 是否已上岸 */
const isLanded = computed(() => appStore.goal?.status === 'landed')

/**
 * 加载各表条数
 *
 * @returns {Promise<void>}
 */
onMounted(async () => {
  try {
    counts.value = {
      任务: await db.tasks.count(),
      申请: await db.applications.count(),
      弹药: await db.knowledgeItems.count(),
      能量记录: await db.moodLogs.count(),
      复盘: await db.dailyReviews.count()
    }
  } catch (err) {
    toast.value = '统计失败'
  }
})

/**
 * 暂停或恢复战役
 *
 * @returns {Promise<void>}
 */
async function togglePause(): Promise<void> {
  try {
    await appStore.setGoalStatus(isPaused.value ? 'active' : 'paused')
    toast.value = isPaused.value ? '战役已恢复' : '战役已暂停'
  } catch (err) {
    toast.value = '操作失败'
  }
}

/**
 * 标记已上岸
 *
 * @returns {Promise<void>}
 */
async function markLanded(): Promise<void> {
  try {
    await appStore.setGoalStatus('landed')
    toast.value = '恭喜登陆成功'
  } catch (err) {
    toast.value = '操作失败'
  }
}

/**
 * 导出全量 JSON 备份（本地生成，无外发）
 *
 * @returns {Promise<void>}
 */
async function exportJSON(): Promise<void> {
  try {
    const payload = {
      app: 'ShoreOps',
      version: '1.0.0',
      goal: appStore.goal,
      milestones: await db.milestones.toArray(),
      tasks: await db.tasks.toArray(),
      applications: await db.applications.toArray(),
      stageEvents: await db.stageEvents.toArray(),
      interviews: await db.interviews.toArray(),
      interviewReviews: await db.interviewReviews.toArray(),
      dailyReviews: await db.dailyReviews.toArray(),
      moodLogs: await db.moodLogs.toArray(),
      knowledgeItems: await db.knowledgeItems.toArray(),
      userAchievements: await db.userAchievements.toArray(),
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shoreops-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.value = '已导出到本地'
  } catch (err) {
    toast.value = '导出失败'
  }
}

/**
 * 永久清空所有数据并重新加载
 *
 * @returns {Promise<void>}
 */
async function clearAll(): Promise<void> {
  if (!agreed.value) return
  try {
    await db.delete()
    window.location.reload()
  } catch (err) {
    toast.value = '清空失败'
  }
}

/** 字号选项 */
const fontSizeOptions: Array<{ value: 'normal' | 'lg' | 'xl'; label: string }> = [
  { value: 'normal', label: '标准' },
  { value: 'lg', label: '较大' },
  { value: 'xl', label: '最大' }
]
</script>

<template>
  <div class="page-container profile-view">
    <!-- 档案头 -->
    <header class="profile-head card">
      <div class="head-avatar">{{ appStore.goal?.position.slice(0, 1) ?? '官' }}</div>
      <div class="head-info">
        <h1 class="head-position">{{ appStore.goal?.position ?? '求职者' }}</h1>
        <p class="muted">{{ appStore.goal?.city }} · D-Day {{ appStore.goal?.dDay }}</p>
      </div>
      <span v-if="isLanded" class="landed-tag">已上岸</span>
    </header>

    <!-- 目标管理 -->
    <section class="group card">
      <h2 class="group-title">战役管理</h2>
      <div class="group-actions">
        <button class="row-btn" :disabled="isLanded" @click="togglePause">
          <Icon :name="isPaused ? 'play' : 'pause'" :size="18" />
          <span>{{ isPaused ? '恢复战役' : '暂停战役' }}</span>
        </button>
        <button class="row-btn" :disabled="isLanded" @click="markLanded">
          <Icon name="flag" :size="18" />
          <span>标记已上岸</span>
        </button>
      </div>
    </section>

    <!-- 数据管理 -->
    <section class="group card">
      <h2 class="group-title">本地数据</h2>
      <div class="count-grid">
        <div v-for="(v, k) in counts" :key="k" class="count-item">
          <span class="num count-num">{{ v }}</span>
          <span class="count-label">{{ k }}</span>
        </div>
      </div>
      <div class="group-actions">
        <button class="row-btn" @click="exportJSON">
          <Icon name="download" :size="18" /><span>导出 JSON 备份</span>
        </button>
        <button class="row-btn danger" @click="confirmClear = !confirmClear">
          <Icon name="trash" :size="18" /><span>清空所有数据</span>
        </button>
      </div>

      <div v-if="confirmClear" class="clear-confirm">
        <p class="confirm-text">将永久删除本设备上的全部作战数据，且不可恢复。建议先导出备份。</p>
        <label class="agree-row">
          <input v-model="agreed" type="checkbox" />
          <span>我已知晓数据将无法恢复</span>
        </label>
        <button class="btn-primary danger-btn" :disabled="!agreed" @click="clearAll">永久清空</button>
      </div>
    </section>

    <!-- 外观 -->
    <section class="group card">
      <h2 class="group-title">外观</h2>
      <div class="font-size-row">
        <span class="muted">字号</span>
        <button
          v-for="o in fontSizeOptions"
          :key="o.value"
          class="size-chip"
          :class="{ active: appStore.settings?.fontSize === o.value }"
          @click="appStore.updateSettings({ fontSize: o.value })"
        >{{ o.label }}</button>
      </div>
      <label class="switch-row">
        <span>减弱动效</span>
        <input
          type="checkbox"
          class="switch-input"
          :checked="appStore.settings?.reduceMotion"
          @change="appStore.updateSettings({ reduceMotion: ($event.target as HTMLInputElement).checked })"
        />
      </label>
    </section>

    <!-- 关于 -->
    <section class="group card">
      <h2 class="group-title">关于与隐私</h2>
      <p class="privacy-text muted">
        <Icon name="shield" :size="14" /> 数据永不离开本设备，除非你主动导出；离线全功能可用。
      </p>
      <p class="muted version">版本 1.0.0 · ShoreOps</p>
    </section>

    <Transition name="fade-slide">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.profile-view { display: flex; flex-direction: column; gap: var(--space-4); }
.profile-head { display: flex; align-items: center; gap: var(--space-4); }
.head-avatar { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: var(--color-cyan-50); color: var(--color-primary-active); border-radius: var(--radius-lg); font-size: 22px; font-weight: 700; }
.head-info { flex: 1; }
.head-position { font-size: 18px; font-weight: 600; }
.landed-tag { padding: var(--space-1) var(--space-3); background: var(--color-success-bg); color: var(--color-success-text); border-radius: var(--radius-sm); font-size: 13px; }
.group { display: flex; flex-direction: column; gap: var(--space-3); }
.group-title { font-size: 14px; color: var(--color-text-tertiary); }
.group-actions { display: flex; flex-direction: column; gap: var(--space-1); }
.row-btn { display: flex; align-items: center; gap: var(--space-3); height: 44px; padding: 0 var(--space-2); color: var(--color-gray-700); border-radius: var(--radius-md); text-align: left; font-size: 14px; }
.row-btn:hover { background: var(--color-gray-50); }
.row-btn:disabled { color: var(--color-text-disabled); }
.row-btn.danger { color: var(--color-danger-text); }
.count-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: var(--space-3); padding: var(--space-3); background: var(--color-gray-50); border-radius: var(--radius-md); }
.count-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.count-num { font-size: 20px; font-weight: 700; }
.count-label { font-size: 12px; color: var(--color-text-tertiary); }
.clear-confirm { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--color-danger); border-radius: var(--radius-md); }
.confirm-text { font-size: 13px; color: var(--color-danger-text); }
.agree-row { display: flex; align-items: center; gap: var(--space-2); font-size: 13px; }
.danger-btn { background: var(--color-danger-solid); color: #fff; align-self: flex-start; }
.danger-btn:disabled { background: var(--color-gray-300); }
.font-size-row { display: flex; align-items: center; gap: var(--space-3); }
.size-chip { padding: var(--space-1) var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--color-border); background: #fff; font-size: 13px; color: var(--color-gray-600); }
.size-chip.active { background: var(--color-cyan-50); border-color: var(--color-primary-hover); color: var(--color-primary-active); }
.switch-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; }
.switch-input { width: 20px; height: 20px; accent-color: var(--color-primary-hover); }
.privacy-text { display: flex; align-items: center; gap: var(--space-1); font-size: 13px; }
.version { font-size: 12px; }
.toast { position: fixed; top: var(--space-3); left: 50%; transform: translateX(-50%); padding: var(--space-3) var(--space-5); background: var(--color-gray-800); color: #fff; border-radius: var(--radius-md); font-size: 13px; z-index: var(--z-toast); }
</style>
