<!--
  组件：CountdownHero 上岸倒计时主卡
  核心功能：显示距 D-Day 天数（大数字）、目标岗位/城市、战役总进度条；处理冲刺/紧急/过期态。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { usePlanStore } from '@/stores/plan'
import { daysBetween, formatCN, todayISO } from '@/utils/date'

/** 应用状态 */
const appStore = useAppStore()
/** 计划状态（用于里程碑刻点） */
const planStore = usePlanStore()

/** 剩余天数（D-Day - 今天，可为负） */
const remainDays = computed(() =>
  appStore.goal ? daysBetween(todayISO(), appStore.goal.dDay) : 0
)
/** 总战役天数 */
const totalDays = computed(() =>
  appStore.goal
    ? daysBetween(appStore.goal.startDate, appStore.goal.dDay)
    : 1
)
/** 已过天数 */
const elapsedDays = computed(() =>
  appStore.goal
    ? daysBetween(appStore.goal.startDate, todayISO())
    : 0
)
/** 进度百分比 0-100 */
const progress = computed(() => {
  const ratio = Math.min(Math.max(elapsedDays.value / totalDays.value, 0), 1)
  return Math.round(ratio * 100)
})
/** 是否冲刺期（≤7 天且 ≥0） */
const isSprint = computed(
  () => remainDays.value <= 7 && remainDays.value >= 0
)
/** 是否紧急（≤3 天且 ≥0） */
const isUrgent = computed(
  () => remainDays.value <= 3 && remainDays.value >= 0
)
/** 是否过期 */
const isExpired = computed(() => remainDays.value < 0)
</script>

<template>
  <section class="hero card" aria-label="上岸倒计时">
    <div class="hero-main">
      <p class="hero-eyebrow">距 D-DAY 登陆日</p>
      <div v-if="appStore.goal" class="hero-number-row">
        <span
          class="hero-number num"
          :class="{ sprint: isSprint, urgent: isUrgent }"
        >
          {{ Math.abs(remainDays) }}
        </span>
        <span class="hero-unit">天</span>
        <span v-if="isUrgent" class="status-tag danger-tag">紧急</span>
        <span v-else-if="isSprint" class="status-tag sprint-tag">冲刺期</span>
        <span v-if="isExpired" class="status-tag sprint-tag">已过期</span>
      </div>
      <div v-else class="empty-goal">
        <p class="empty-goal-text">设定 D-Day，30 秒生成作战地图</p>
        <RouterLink :to="{ name: 'onboarding' }" class="btn-primary">去设定</RouterLink>
      </div>
      <p v-if="appStore.goal" class="hero-sub">
        {{ appStore.goal.position }} · {{ appStore.goal.city }}
      </p>
      <p class="hero-date muted">{{ formatCN(todayISO()) }}</p>
    </div>

    <div class="hero-progress">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="progress-labels">
        <span class="num progress-percent">{{ progress }}%</span>
        <span class="muted">总战役 {{ totalDays }} 天</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-5);
  padding: var(--space-6);
}
@media (min-width: 768px) {
  .hero {
    flex-direction: row;
    align-items: flex-end;
  }
}
.hero-eyebrow {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}
.empty-goal {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-2);
}
.empty-goal-text {
  font-size: 15px;
  color: var(--color-gray-600);
}
.hero-number-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-top: var(--space-1);
}
.hero-number {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--color-text-primary);
}
@media (min-width: 768px) {
  .hero-number {
    font-size: 56px;
  }
}
.hero-number.sprint {
  color: var(--color-warning);
}
.hero-number.urgent {
  color: var(--color-danger);
}
.hero-unit {
  font-size: 18px;
  font-weight: 500;
  color: var(--color-gray-600);
}
.hero-sub {
  margin-top: var(--space-2);
  font-size: 15px;
  color: var(--color-gray-600);
}
.hero-date {
  margin-top: var(--space-1);
}
.status-tag {
  margin-left: var(--space-2);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: 12px;
}
.sprint-tag {
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
}
.danger-tag {
  background: var(--color-danger-bg);
  color: var(--color-danger-text);
}
.hero-progress {
  flex: 1;
  min-width: 200px;
}
.progress-track {
  height: 8px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--color-primary-hover);
  border-radius: var(--radius-full);
  transition: width var(--duration-slow) var(--ease-out);
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-2);
}
.progress-percent {
  font-size: 13px;
  color: var(--color-gray-700);
}
</style>
