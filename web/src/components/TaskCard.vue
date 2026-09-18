<!--
  组件：TaskCard 作战任务卡
  核心功能：展示打卡框、标题、类型 Chip、时长、截止日与状态；支持点击打卡与编辑。
  交互：打卡后卡片变灰、标题删除线；逾期红字；进行中左缘青条。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '@/types'
import { daysBetween, todayISO } from '@/utils/date'
import Icon from '@/components/Icon.vue'

/** 组件属性 */
const props = defineProps<{
  /** 任务实体 */
  task: Task
}>()

/** 组件事件 */
const emit = defineEmits<{
  /** 切换完成 */
  (e: 'toggle', id: string): void
  /** 编辑 */
  (e: 'edit', id: string): void
  /** 顺延到明天 */
  (e: 'snooze', id: string): void
}>()

/** 是否完成 */
const isDone = computed(() => props.task.status === 'done')
/** 是否逾期 */
const isOverdue = computed(
  () => props.task.dueDate < todayISO() && !isDone.value
)
/** 今日是否到期 */
const isToday = computed(() => props.task.dueDate === todayISO())

/** 类型中文映射 */
const typeLabel: Record<string, string> = {
  apply: '投递',
  resume: '简历',
  drill: '刷题',
  interview: '面试',
  review: '复盘',
  study: '学习',
  network: '人脉',
  rest: '休整'
}
/** 类型图标映射 */
const typeIcon: Record<string, string> = {
  apply: 'paperplane',
  resume: 'file',
  drill: 'pen',
  interview: 'users',
  review: 'refresh',
  study: 'book',
  network: 'users',
  rest: 'moon'
}
</script>

<template>
  <div
    class="task-card"
    :class="{
      done: isDone,
      overdue: isOverdue,
      doing: task.status === 'doing'
    }"
  >
    <button
      class="check-btn"
      :aria-label="isDone ? '标记为未完成' : '完成任务'"
      :aria-pressed="isDone"
      @click="emit('toggle', task.id)"
    >
      <Icon v-if="isDone" name="check" :size="14" />
    </button>

    <div class="task-body" @click="emit('edit', task.id)">
      <p class="task-title">{{ task.title }}</p>
      <div class="task-meta">
        <span class="type-chip">
          <Icon :name="typeIcon[task.type]" :size="12" />
          {{ typeLabel[task.type] }}
        </span>
        <span class="meta-item">
          <Icon name="clock" :size="12" />
          {{ task.estimateMinutes }} 分钟
        </span>
        <span v-if="!isToday && !isDone" class="meta-item" :class="{ 'text-danger': isOverdue }">
          <Icon name="calendar" :size="12" />
          {{ task.dueDate.slice(5).replace('-', '/') }}
        </span>
      </div>
    </div>

    <button
      v-if="!isDone"
      class="snooze-btn"
      aria-label="顺延到明天"
      :disabled="task.snoozeCount >= 3"
      @click.stop="emit('snooze', task.id)"
    >
      <Icon name="clock" :size="16" />
    </button>

    <button class="edit-btn" aria-label="编辑任务" @click="emit('edit', task.id)">
      <Icon name="more" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.task-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: background var(--duration-slow) var(--ease-out);
}
.task-card.doing {
  border-left: 3px solid var(--color-primary-hover);
}
.task-card.overdue {
  border-color: var(--color-danger);
}
.check-btn {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--color-gray-300);
  border-radius: var(--radius-sm);
  color: #fff;
  transition: background var(--duration-base) var(--ease-out);
}
.check-btn:hover {
  border-color: var(--color-primary-hover);
}
.check-btn[aria-pressed='true'] {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}
.task-body {
  flex: 1;
  min-width: 0;
}
.task-title {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}
.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.type-chip,
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.type-chip {
  padding: 1px var(--space-2);
  background: var(--color-gray-50);
  border-radius: var(--radius-sm);
}
.snooze-btn {
  flex-shrink: 0;
  color: var(--color-gray-400);
}
.snooze-btn:disabled {
  opacity: 0.4;
}
.edit-btn {
  flex-shrink: 0;
  color: var(--color-gray-400);
}
.text-danger {
  color: var(--color-danger-text) !important;
}
/* 完成态 */
.task-card.done {
  background: var(--color-gray-50);
}
.task-card.done .task-title {
  color: var(--color-text-disabled);
  text-decoration: line-through;
}
.task-card.done .type-chip,
.task-card.done .meta-item {
  color: var(--color-text-disabled);
}
</style>
