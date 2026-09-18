<!--
  视图：DashboardView 指挥台
  核心功能：一屏掌握倒计时、今日三垒、连续作战、能量、战备值与漏斗概览。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlanStore } from '@/stores/plan'
import { useFunnelStore } from '@/stores/funnel'
import { useEnergyStore } from '@/stores/energy'
import { useAmmoStore } from '@/stores/ammo'
import type { Task } from '@/types'
import CountdownHero from '@/components/CountdownHero.vue'
import TaskCard from '@/components/TaskCard.vue'
import TaskFormModal from '@/components/TaskFormModal.vue'
import Icon from '@/components/Icon.vue'

/** 路由 */
const router = useRouter()
/** 计划 */
const planStore = usePlanStore()
/** 漏斗 */
const funnelStore = useFunnelStore()
/** 能量 */
const energyStore = useEnergyStore()
/** 弹药 */
const ammoStore = useAmmoStore()

/** 任务模态显示 */
const modalShow = ref(false)
/** 模态编辑目标 */
const editingTask = ref<Task | null>(null)
/** 新增是否进入三垒 */
const addAsMIT = ref(false)
/** Toast 文案 */
const toast = ref('')

/** 三垒空坑数量 */
const emptySlots = computed(() => Math.max(0, 3 - planStore.todayMIT.length))
/** 今日其他任务（前 6 条） */
const otherTasks = computed(() => planStore.todayOther.slice(0, 6))
/** 是否还有更多其他任务 */
const hasMoreOther = computed(() => planStore.todayOther.length > 6)

/**
 * 显示一个 2.5 秒的 Toast
 *
 * @param {string} msg - 文案
 * @returns {void}
 */
function showToast(msg: string): void {
  toast.value = msg
  window.setTimeout(() => {
    toast.value = ''
  }, 2500)
}

/**
 * 页面挂载：并行加载漏斗/能量/弹药
 *
 * @returns {Promise<void>}
 */
onMounted(async () => {
  try {
    await Promise.all([
      funnelStore.loadAll(),
      energyStore.loadAll(),
      ammoStore.loadAll()
    ])
  } catch (err) {
    showToast('部分数据加载失败，已使用本地缓存')
  }
})

/**
 * 切换任务完成
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
 * 顺延任务到明天
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
 * 打开三垒空坑新增
 *
 * @returns {void}
 */
function openAddMIT(): void {
  editingTask.value = null
  addAsMIT.value = true
  modalShow.value = true
}

/**
 * 打开普通新增
 *
 * @returns {void}
 */
function openAddNormal(): void {
  editingTask.value = null
  addAsMIT.value = false
  modalShow.value = true
}

/**
 * 打开编辑
 *
 * @param {string} id - 任务 id
 * @returns {void}
 */
function openEdit(id: string): void {
  editingTask.value = planStore.tasks.find((t) => t.id === id) ?? null
  modalShow.value = true
}

/**
 * 保存任务（新建或更新）
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
      const created = await planStore.addTask(payload)
      if (addAsMIT.value) {
        await planStore.setMIT(created.id, true)
      }
    }
    modalShow.value = false
    showToast('已保存')
  } catch (err) {
    showToast(err instanceof Error ? err.message : '保存失败')
  }
}
</script>

<template>
  <div class="page-container dashboard">
    <CountdownHero />

    <!-- 状态卡行 -->
    <div class="stat-row">
      <div class="stat-card card">
        <div class="stat-head">
          <Icon name="flame" :size="18" class="text-orange" />
          <span class="stat-label">连续作战</span>
        </div>
        <p class="stat-value num">{{ planStore.streak }} <span class="stat-unit">天</span></p>
        <p class="muted stat-foot">本周 {{ planStore.weekRate.done }}/{{ planStore.weekRate.total }} 天</p>
      </div>

      <button class="stat-card card stat-btn" @click="router.push({ name: 'energy' })">
        <div class="stat-head">
          <Icon name="battery" :size="18" class="text-cyan" />
          <span class="stat-label">今日能量</span>
        </div>
        <p class="stat-value num">
          {{ energyStore.todayMood?.energy ?? '—' }}
          <span class="stat-unit">/ 5</span>
        </p>
        <p class="muted stat-foot">{{ energyStore.todayMood ? '已记录' : '去记录' }}</p>
      </button>

      <button class="stat-card card stat-btn" @click="router.push({ name: 'ammo' })">
        <div class="stat-head">
          <Icon name="box" :size="18" class="text-cyan" />
          <span class="stat-label">战备值</span>
        </div>
        <p class="stat-value num">{{ ammoStore.totalCount }} <span class="stat-unit">条弹药</span></p>
        <p class="muted stat-foot">待复习 {{ ammoStore.dueReviews.length }}</p>
      </button>
    </div>

    <!-- 今日三垒 -->
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">今日三垒</h2>
        <button class="btn-text" @click="openAddNormal">
          <Icon name="plus" :size="16" /> 添加任务
        </button>
      </div>

      <div class="mit-grid">
        <TaskCard
          v-for="task in planStore.todayMIT"
          :key="task.id"
          :task="task"
          @toggle="handleToggle"
          @edit="openEdit"
          @snooze="handleSnooze"
        />
        <button
          v-for="i in emptySlots"
          :key="'empty-' + i"
          class="empty-slot"
          @click="openAddMIT"
        >
          <Icon name="plus" :size="22" />
          <span>置顶一件重要的事</span>
        </button>
      </div>
    </section>

    <!-- 今日其他 -->
    <section v-if="otherTasks.length" class="section">
      <div class="section-head">
        <h2 class="section-title">今日其他</h2>
        <RouterLink v-if="hasMoreOther" :to="{ name: 'tasks' }" class="btn-text">查看全部</RouterLink>
      </div>
      <div class="other-list">
        <TaskCard
          v-for="task in otherTasks"
          :key="task.id"
          :task="task"
          @toggle="handleToggle"
          @edit="openEdit"
          @snooze="handleSnooze"
        />
      </div>
    </section>

    <!-- 漏斗概览 -->
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">战场态势</h2>
        <RouterLink :to="{ name: 'funnel' }" class="btn-text">打开看板</RouterLink>
      </div>
      <div class="funnel-overview card">
        <div
          v-for="(count, stage) in funnelStore.stageCounts"
          :key="stage"
          class="funnel-cell"
        >
          <span class="funnel-count num">{{ count }}</span>
          <span class="funnel-name">
            {{ { wishlist: '意向', applied: '已投', written: '笔试', interview: '面试', offer: 'Offer', closed: '结束' }[stage] }}
          </span>
        </div>
      </div>
    </section>

    <TaskFormModal
      :show="modalShow"
      :task="editingTask"
      @close="modalShow = false"
      @save="handleSave"
    />

    <Transition name="fade-slide">
      <div v-if="toast" class="toast" role="status">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.stat-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}
@media (min-width: 768px) {
  .stat-row {
    grid-template-columns: repeat(3, 1fr);
  }
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: left;
}
.stat-btn {
  cursor: pointer;
}
.stat-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.stat-label {
  font-size: 13px;
  color: var(--color-text-tertiary);
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}
.stat-unit {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-gray-500);
}
.text-orange {
  color: var(--color-warning);
}
.text-cyan {
  color: var(--color-primary-hover);
}
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mit-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.empty-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 64px;
  border: 1px dashed var(--color-gray-400);
  border-radius: var(--radius-lg);
  color: var(--color-gray-500);
  font-size: 13px;
}
.other-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.funnel-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
@media (min-width: 768px) {
  .funnel-overview {
    grid-template-columns: repeat(6, 1fr);
  }
}
.funnel-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}
.funnel-count {
  font-size: 24px;
  font-weight: 700;
}
.funnel-name {
  font-size: 12px;
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
