<!--
  视图：MapView 作战地图
  核心功能：纵向时间线展示里程碑（阶段色带+完成率），支持展开关联任务与整体顺延。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { ref } from 'vue'
import type { Milestone } from '@/types'
import { usePlanStore } from '@/stores/plan'
import { cascadeShift } from '@/utils/planner'
import { db } from '@/db/database'
import { formatCN, todayISO } from '@/utils/date'
import Icon from '@/components/Icon.vue'

/** 计划状态 */
const planStore = usePlanStore()
/** 展开的里程碑 id */
const expandedId = ref<string | null>(null)
/** Toast */
const toast = ref('')

/**
 * 计算里程碑所属色带 index（0-6）
 *
 * @param {Milestone} m - 里程碑
 * @returns {number} 色带 index
 */
function bandIndex(m: Milestone): number {
  const isLast = m.order === planStore.milestones.length - 1
  if (m.phase === 'prepare') return 0
  if (m.phase === 'assets') return 1
  if (m.phase === 'apply') return 2
  if (m.phase === 'written') return 3
  if (m.phase === 'interview') return 4
  if (m.phase === 'offer') return isLast ? 6 : 5
  return 0
}

/**
 * 获取里程碑关联任务
 *
 * @param {string} id - 里程碑 id
 * @returns {import('@/types').Task[]} 任务列表
 */
function tasksOf(id: string) {
  return planStore.tasks.filter((t) => t.milestoneId === id)
}

/**
 * 切换展开
 *
 * @param {string} id - 里程碑 id
 * @returns {void}
 */
function toggleExpand(id: string): void {
  expandedId.value = expandedId.value === id ? null : id
}

/**
 * 从指定里程碑起整体顺延 7 天
 *
 * @param {string} id - 里程碑 id
 * @returns {Promise<void>}
 */
async function handleShift(id: string): Promise<void> {
  try {
    const result = cascadeShift(planStore.milestones, planStore.tasks, id, 7)
    await db.milestones.bulkPut(result.milestones)
    await db.tasks.bulkPut(result.tasks)
    planStore.hydrate(result.milestones, result.tasks)
    toast.value = '已整体顺延 7 天'
    window.setTimeout(() => (toast.value = ''), 2500)
  } catch (err) {
    toast.value = '顺延失败'
  }
}

/** 里程碑状态中文 */
const statusLabel: Record<string, string> = {
  pending: '未开始',
  ongoing: '进行中',
  done: '已完成',
  overdue: '已逾期',
  missed: '已错过'
}
</script>

<template>
  <div class="page-container map-view">
    <header class="map-header">
      <h1 class="page-title">作战地图</h1>
      <p class="muted">以 D-Day 为锚倒排，点击里程碑查看任务</p>
    </header>

    <ol class="timeline">
      <li
        v-for="m in planStore.milestones"
        :key="m.id"
        class="timeline-item"
        :class="`band-${bandIndex(m)}`"
      >
        <div class="node-col">
          <span class="node" :class="m.status">
            <Icon v-if="m.status === 'done'" name="check" :size="12" />
          </span>
        </div>

        <div class="milestone-card" @click="toggleExpand(m.id)">
          <div class="ms-head">
            <h2 class="ms-title">{{ m.title }}</h2>
            <span class="ms-status" :class="m.status">{{ statusLabel[m.status] }}</span>
          </div>
          <p class="ms-date num">
            {{ m.plannedDate === todayISO() ? '今天' : formatCN(m.plannedDate) }}
            <span class="ms-offset">D-{{ m.offsetFromDDay }}</span>
          </p>
          <p class="ms-deliverable">{{ m.deliverable }}</p>

          <div class="ms-progress">
            <div class="mini-track">
              <div
                class="mini-fill"
                :style="{ width: Math.round(planStore.milestoneCompletion(m.id) * 100) + '%' }"
              ></div>
            </div>
            <span class="mini-percent num">
              {{ Math.round(planStore.milestoneCompletion(m.id) * 100) }}%
            </span>
          </div>

          <div v-if="expandedId === m.id" class="ms-tasks" @click.stop>
            <p
              v-for="t in tasksOf(m.id)"
              :key="t.id"
              class="ms-task"
              :class="{ done: t.status === 'done' }"
            >
              <Icon :name="t.status === 'done' ? 'check' : 'target'" :size="14" />
              {{ t.title }}
            </p>
            <button class="btn-text shift-btn" @click="handleShift(m.id)">
              <Icon name="refresh" :size="14" /> 从此处整体顺延 7 天
            </button>
          </div>
        </div>
      </li>
    </ol>

    <Transition name="fade-slide">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.map-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.timeline-item {
  display: flex;
  gap: var(--space-3);
}
.node-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.node {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: #fff;
  border: 1.5px solid var(--color-gray-300);
  color: #fff;
}
.node.ongoing {
  border-color: var(--color-primary-hover);
}
.node.done {
  background: var(--color-success);
  border-color: var(--color-success);
}
.node.overdue,
.node.missed {
  border-color: var(--color-gray-400);
}
.milestone-card {
  flex: 1;
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  cursor: pointer;
}
.band-0 .milestone-card { background: var(--phase-0-bg); }
.band-1 .milestone-card { background: var(--phase-1-bg); }
.band-2 .milestone-card { background: var(--phase-2-bg); }
.band-3 .milestone-card { background: var(--phase-3-bg); }
.band-4 .milestone-card { background: var(--phase-4-bg); }
.band-5 .milestone-card { background: var(--phase-5-bg); }
.band-6 .milestone-card { background: var(--phase-6-bg); }
.ms-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.ms-title {
  font-size: 16px;
  font-weight: 600;
}
.ms-status {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.ms-status.ongoing { color: var(--color-primary-active); }
.ms-status.done { color: var(--color-success-text); }
.ms-date {
  margin-top: var(--space-1);
  font-size: 13px;
  color: var(--color-gray-600);
}
.ms-offset {
  margin-left: var(--space-2);
  padding: 0 var(--space-2);
  background: rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-sm);
}
.ms-deliverable {
  margin-top: var(--space-1);
  font-size: 13px;
  color: var(--color-gray-600);
}
.ms-progress {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.mini-track {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.mini-fill {
  height: 100%;
  background: var(--color-primary-hover);
  border-radius: var(--radius-full);
}
.mini-percent {
  font-size: 12px;
  color: var(--color-gray-600);
}
.ms-tasks {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.ms-task {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 13px;
  color: var(--color-gray-700);
}
.ms-task.done {
  color: var(--color-text-disabled);
}
.shift-btn {
  align-self: flex-start;
}
.toast {
  position: fixed;
  top: var(--space-3);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-3) var(--space-5);
  background: var(--color-gray-800);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: 13px;
  z-index: var(--z-toast);
}
</style>
