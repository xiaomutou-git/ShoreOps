<!--
  视图：OnboardingView 启动引导
  核心功能：3 步完成「欢迎 → 身份选择 → 目标设定」，生成倒排战役后进入指挥台。
  设计思路：≤3 步 ≤1 分钟；隐私承诺前置；生成态 800ms 强化"魔法时刻"。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { JobSearchType } from '@/types'
import { useAppStore } from '@/stores/app'
import { addDays, daysBetween, todayISO } from '@/utils/date'
import Icon from '@/components/Icon.vue'

/** 应用状态 */
const appStore = useAppStore()
/** 路由 */
const router = useRouter()

/** 当前步骤（0-2） */
const step = ref(0)
/** 是否生成中 */
const generating = ref(false)
/** 错误信息 */
const errorMsg = ref('')

/** 身份选项 */
const typeOptions: Array<{
  value: JobSearchType
  label: string
  desc: string
  icon: string
}> = [
  { value: 'campus', label: '校招生', desc: '锚定批次，按官方时间倒排', icon: 'calendar' },
  { value: 'social', label: '社招在职', desc: '隐私安全，碎片时间推进', icon: 'shield' },
  { value: 'transition', label: '转行者', desc: '能力重建，长期续航', icon: 'refresh' }
]

/** 选中的求职类型 */
const selectedType = ref<JobSearchType>('social')
/** 目标岗位 */
const position = ref('')
/** 目标城市 */
const city = ref('')
/** D-Day */
const dDay = ref(addDays(todayISO(), 84))
/** 每周可作战天数 */
const weeklyDays = ref(6)
/** 每日可投入小时数（0.5-12，默认 2） */
const dailyHours = ref(2)

/** D-Day 是否过近（<7天）；仅柔性提示，不阻断 */
const isTooClose = computed(
  () => dDay.value > todayISO() && daysBetween(todayISO(), dDay.value) < 7
)

/** 最早可选日期（明天） */
const minDate = computed(() => addDays(todayISO(), 1))
/** 步骤能否继续 */
const canNext = computed(() => {
  if (step.value === 1) return !!selectedType.value
  if (step.value === 2) {
    return position.value.trim() && city.value.trim() && dDay.value > todayISO()
  }
  return true
})

/**
 * 进入下一步；末步提交生成战役
 *
 * @returns {Promise<void>}
 */
async function handleNext(): Promise<void> {
  errorMsg.value = ''
  if (step.value < 2) {
    step.value += 1
    return
  }
  try {
    generating.value = true
    await appStore.createGoal({
      type: selectedType.value,
      dDay: dDay.value,
      position: position.value.trim(),
      city: city.value.trim(),
      weeklyAvailableDays: weeklyDays.value,
      dailyCapacityHours: dailyHours.value
    })
    await router.push({ name: 'dashboard' })
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '生成失败，请重试'
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="onboarding">
    <div class="onboarding-card">
      <div class="step-dots" aria-hidden="true">
        <span
          v-for="i in 3"
          :key="i"
          class="dot"
          :class="{ active: step >= i - 1 }"
        ></span>
      </div>

      <!-- 第 0 步：欢迎 -->
      <div v-if="step === 0" class="step-content">
        <Icon name="radar" :size="56" class="welcome-icon" />
        <h1 class="welcome-title">上岸作战室</h1>
        <p class="welcome-slogan">目标日倒排，每一天都朝着 Offer 开火</p>
        <div class="trust-row">
          <Icon name="shield" :size="16" />
          <span>数据仅存于本设备，离线可用，无需注册</span>
        </div>
      </div>

      <!-- 第 1 步：身份选择 -->
      <div v-else-if="step === 1" class="step-content">
        <h2 class="step-title">你属于哪种作战状态？</h2>
        <div class="type-grid">
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            class="type-card"
            :class="{ selected: selectedType === opt.value }"
            @click="selectedType = opt.value"
          >
            <Icon :name="opt.icon" :size="28" />
            <span class="type-label">{{ opt.label }}</span>
            <span class="type-desc">{{ opt.desc }}</span>
          </button>
        </div>
      </div>

      <!-- 第 2 步：目标设定 -->
      <div v-else class="step-content">
        <h2 class="step-title">设定你的登陆目标</h2>
        <div class="form-grid">
          <label class="form-item">
            <span class="form-label">目标岗位</span>
            <input v-model="position" class="field" type="text" placeholder="例如 前端开发" />
          </label>
          <label class="form-item">
            <span class="form-label">目标城市</span>
            <input v-model="city" class="field" type="text" placeholder="例如 杭州" />
          </label>
          <label class="form-item">
            <span class="form-label">D-Day 登陆日</span>
            <input v-model="dDay" class="field" type="date" :min="minDate" />
          </label>
          <div class="form-item">
            <span class="form-label">每周可作战天数：{{ weeklyDays }} 天</span>
            <input v-model.number="weeklyDays" class="range" type="range" min="1" max="7" />
          </div>
          <div class="form-item">
            <span class="form-label">每日可投入：{{ dailyHours }} 小时</span>
            <input v-model.number="dailyHours" class="range" type="range" min="0.5" max="12" step="0.5" />
          </div>
        </div>
        <p v-if="isTooClose" class="hint-msg" role="status">距 D-Day 不足 7 天，计划将被压缩，建议适当延长目标日</p>
        <p v-if="errorMsg" class="error-msg" role="alert">{{ errorMsg }}</p>
      </div>

      <!-- 底部操作 -->
      <div class="actions">
        <button v-if="step > 0" class="btn-text" @click="step -= 1">上一步</button>
        <span v-else></span>
        <button class="btn-primary generate-btn" :disabled="!canNext || generating" @click="handleNext">
          {{ generating ? '正在倒排生成…' : step === 2 ? '生成作战地图' : '开始部署' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  background: var(--color-bg-page);
}
.onboarding-card {
  width: 100%;
  max-width: 440px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  padding: var(--space-8);
}
.step-dots {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  margin-bottom: var(--space-6);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-gray-300);
}
.dot.active {
  background: var(--color-primary-hover);
}
.step-content {
  text-align: center;
}
.welcome-icon {
  color: var(--color-primary-hover);
}
.welcome-title {
  margin-top: var(--space-4);
  font-size: 28px;
  font-weight: 700;
}
.welcome-slogan {
  margin-top: var(--space-2);
  font-size: 14px;
  color: var(--color-gray-600);
}
.trust-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-6);
  padding: var(--space-3);
  background: var(--color-cyan-50);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--color-primary-active);
}
.step-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: var(--space-5);
}
.type-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.type-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  padding: var(--space-4);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-gray-700);
  text-align: left;
}
.type-card.selected {
  border-color: var(--color-primary-hover);
  background: var(--color-cyan-50);
}
.type-label {
  font-size: 15px;
  font-weight: 600;
}
.type-desc {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.form-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  text-align: left;
}
.range {
  width: 100%;
  accent-color: var(--color-primary-hover);
}
.error-msg {
  margin-top: var(--space-3);
  font-size: 13px;
  color: var(--color-danger-text);
}
.hint-msg {
  margin-top: var(--size-3, var(--space-3));
  padding: var(--space-3);
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
  border-radius: var(--radius-md);
  font-size: 13px;
}
.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-8);
}
.generate-btn {
  min-width: 140px;
}
</style>
