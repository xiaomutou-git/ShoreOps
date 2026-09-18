<!--
  视图：TasksView 任务
  核心功能：今日战报、逾期任务、今日三垒与全部任务管理，支持打卡、顺延、新增/编辑。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { ref } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { useAppStore } from '@/stores/app'
import type { Task } from '@/types'
import TaskCard from '@/components/TaskCard.vue'
import TaskFormModal from '@/components/TaskFormModal.vue'
import Icon from '@/components/Icon.vue'

/** 计划 */
const planStore = usePlanStore()
/** 应用（取休整券） */
const appStore = useAppStore()

/** 模态 */
const modalShow = ref(false)
/** 编辑目标 */
const editingTask = ref<Task | null>(null)
/** Toast */
const toast = ref('')

/**
 * Toast
 *
 * @param {string} msg - 文案
 * @returns {void}
 */
function showToast(msg: string): void {
  toast.value = msg
  window.setTimeout(() => (toast.value = ''), 2200)
}

/**
 * 打卡
 *
 * @param {string} id - 任务 id
 * @returns {Promise<void>}
 */
async function handleToggle(id: string): Promise<void> {
  try {
    await planStore.toggleTask(id)
  } catch (err) {
    showToast(err instanceof Error ? err.message : '操作失败')
  }
}

/**
 * 顺延
 *
 * @param {string} id - 任务 id
 * @returns {Promise<void>}
 */
async function handleSnooze(id: string): Promise<void> {
  try {
    await planStore.snoozeTask(id)
    showToast('已顺延到明天')
  } catch (err) {
    showToast(err instanceof Error ? err.message : '顺延失败')
  }
}

/**
 * 编辑
 *
 * @param {string} id - 任务 id
 * @returns {void}
 */
function handleEdit(id: string): void {
  editingTask.value = planStore.tasks.find((t) => t.id === id) ?? null
  modalShow.value = true
}

/**
 * 新增
 *
 * @returns {void}
 */
function openAdd(): void {
  editingTask.value = null
  modalShow.value = true
}

/**
 * 保存
 *
 * @param {{ title:string; type:Task['type']; priority:Task['priority']; estimateMinutes:number; dueDate:string; note:string }} payload - 字段
 * @returns {Promise<void>}
 */
async function handleSave(payload: {
  title: string
  type: Task['type']
  priority: Task['priority']
  estimateMinutes: number
  dueDate: string
  note: string
}): Promise<void> {
  try {
    if (editingTask.value) {
      await planStore.updateTask(editingTask.value.id, payload)
    } else {
      await planStore.addTask(payload)
    }
    modalShow.value = false
  } catch (err) {
    showToast('保存失败')
  }
}
</script>

<template>
  <div class="page-container tasks-view">
    <header class="tasks-header">
      <h1 class="page-title">任务</h1>
      <button class="btn-primary" @click="openAdd">
        <Icon name="plus" :size="16" /> 新任务
      </button>
    </header>

    <!-- 今日战报 -->
    <section class="battle-report card">
      <div class="report-main">
        <p class="report-label">今日战报</p>
        <p class="report-number num">
          {{ planStore.todayDoneCount }}<span class="report-total">/{{ planStore.todayTotal }}</span>
        </p>
      </div>
      <div class="report-side">
        <div class="report-item">
          <Icon name="flame" :size="16" class="orange" />
          <span class="num">{{ planStore.streak }}</span> 天连签
        </div>
        <div class="report-item">
          <Icon name="moon" :size="16" class="amber" />
          <span class="num">{{ appStore.settings?.restCouponsLeft ?? 0 }}</span> 张休整券
        </div>
      </div>
    </section>

    <!-- 逾期 -->
    <section v-if="planStore.overdueTasks.length" class="block">
      <h2 class="block-title">逾期任务（{{ planStore.overdueTasks.length }}）</h2>
      <div class="card-list">
        <TaskCard
          v-for="t in planStore.overdueTasks.slice(0, 5)"
          :key="t.id"
          :task="t"
          @toggle="handleToggle"
          @edit="handleEdit"
          @snooze="handleSnooze"
        />
      </div>
    </section>

    <!-- 今日三垒 -->
    <section class="block">
      <h2 class="block-title">今日三垒</h2>
      <div class="card-list">
        <TaskCard
          v-for="t in planStore.todayMIT"
          :key="t.id"
          :task="t"
          @toggle="handleToggle"
          @edit="handleEdit"
          @snooze="handleSnooze"
        />
        <p v-if="!planStore.todayMIT.length" class="empty-hint">还没有置顶任务，点右上角新增</p>
      </div>
    </section>

    <!-- 今日其他 -->
    <section class="block">
      <h2 class="block-title">今日其他</h2>
      <div class="card-list">
        <TaskCard
          v-for="t in planStore.todayOther"
          :key="t.id"
          :task="t"
          @toggle="handleToggle"
          @edit="handleEdit"
          @snooze="handleSnooze"
        />
        <p v-if="!planStore.todayOther.length" class="empty-hint">暂无其他任务</p>
      </div>
    </section>

    <TaskFormModal
      :show="modalShow"
      :task="editingTask"
      @close="modalShow = false"
      @save="handleSave"
    />

    <Transition name="fade-slide">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.tasks-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.tasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.battle-report {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.report-label {
  font-size: 13px;
  color: var(--color-text-tertiary);
}
.report-number {
  font-size: 40px;
  font-weight: 700;
}
.report-total {
  font-size: 18px;
  font-weight: 400;
  color: var(--color-gray-500);
}
.report-side {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: 13px;
  color: var(--color-gray-600);
}
.report-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.orange { color: var(--color-warning); }
.amber { color: var(--color-warning); }
.block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.block-title {
  font-size: 15px;
  font-weight: 600;
}
.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.empty-hint {
  font-size: 13px;
  color: var(--color-text-tertiary);
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
