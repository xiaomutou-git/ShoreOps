<!--
  视图：EnergyView 士气能量站
  核心功能：今日能量（电池 1-5）+情绪标签+日记，近 14 天能量曲线，焦虑急救（478呼吸/三问/一键休整）。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useEnergyStore } from '@/stores/energy'
import { usePlanStore } from '@/stores/plan'
import type { EmotionTag } from '@/types'
import Icon from '@/components/Icon.vue'

/** 能量 store */
const energyStore = useEnergyStore()
/** 计划（一键休整生成任务） */
const planStore = usePlanStore()

/** 选中能量 */
const energy = ref(energyStore.todayMood?.energy ?? 3)
/** 选中情绪 */
const emotions = ref<EmotionTag[]>(energyStore.todayMood?.emotions ?? [])
/** 日记 */
const note = ref(energyStore.todayMood?.note ?? '')
/** Toast */
const toast = ref('')

/** 呼吸模态 */
const breathing = ref(false)
/** 呼吸阶段文字 */
const breathPhase = ref('吸气')
/** 呼吸剩余秒 */
const breathSecond = ref(4)
/** 呼吸计时器 */
let breathTimer: number | null = null

/** 情绪选项（文字标签，不使用 emoji） */
const emotionOptions: Array<{ value: EmotionTag; label: string }> = [
  { value: 'anxious', label: '焦虑' },
  { value: 'lost', label: '迷茫' },
  { value: 'tired', label: '疲惫' },
  { value: 'calm', label: '平静' },
  { value: 'inspired', label: '被鼓舞' },
  { value: 'excited', label: '兴奋' },
  { value: 'wronged', label: '委屈' },
  { value: 'angry', label: '愤怒' }
]

/** 焦虑三问表单 */
const threeQuestions = reactive({
  worst: '',
  evidence: '',
  actions: ''
})

/** 曲线点位（近14天，viewBox 280x100） */
const curvePoints = computed(() => {
  const data = energyStore.recent14
  const stepX = 280 / 13
  return data
    .map((d, i) => {
      if (d.energy === null) return null
      const x = i * stepX
      const y = 90 - (d.energy - 1) * 18
      return `${x.toFixed(1)},${y}`
    })
    .filter(Boolean)
    .join(' ')
})

/**
 * 加载
 *
 * @returns {Promise<void>}
 */
onMounted(async () => {
  try {
    await energyStore.loadAll()
    energy.value = energyStore.todayMood?.energy ?? 3
  } catch (err) {
    toast.value = '加载失败'
  }
})

/**
 * 切换情绪（最多 3 个）
 *
 * @param {EmotionTag} tag - 情绪
 * @returns {void}
 */
function toggleEmotion(tag: EmotionTag): void {
  const idx = emotions.value.indexOf(tag)
  if (idx >= 0) {
    emotions.value.splice(idx, 1)
  } else if (emotions.value.length < 3) {
    emotions.value.push(tag)
  }
}

/**
 * 保存今日能量
 *
 * @returns {Promise<void>}
 */
async function save(): Promise<void> {
  try {
    await energyStore.recordMood({
      energy: energy.value,
      emotions: emotions.value,
      note: note.value
    })
    toast.value = '能量已记录'
    window.setTimeout(() => (toast.value = ''), 2000)
  } catch (err) {
    toast.value = '保存失败'
  }
}

/**
 * 启动 478 呼吸循环
 *
 * @returns {void}
 */
function startBreathing(): void {
  breathing.value = true
  const cycle = [
    { phase: '吸气', seconds: 4 },
    { phase: '屏息', seconds: 7 },
    { phase: '呼气', seconds: 8 }
  ]
  let stage = 0
  breathPhase.value = cycle[0].phase
  breathSecond.value = cycle[0].seconds
  breathTimer = window.setInterval(() => {
    breathSecond.value -= 1
    if (breathSecond.value <= 0) {
      stage = (stage + 1) % cycle.length
      breathPhase.value = cycle[stage].phase
      breathSecond.value = cycle[stage].seconds
    }
  }, 1000)
}

/**
 * 停止呼吸
 *
 * @returns {void}
 */
function stopBreathing(): void {
  breathing.value = false
  if (breathTimer !== null) {
    window.clearInterval(breathTimer)
    breathTimer = null
  }
}

onUnmounted(stopBreathing)

/**
 * 一键休整：生成休整任务
 *
 * @returns {Promise<void>}
 */
async function takeRest(): Promise<void> {
  try {
    await planStore.addTask({
      title: '休整：吃饭 · 散步15分钟 · 早睡',
      type: 'rest',
      priority: 'low'
    })
    toast.value = '已安排休整，使用休整券不断签'
    window.setTimeout(() => (toast.value = ''), 2500)
  } catch (err) {
    toast.value = '操作失败'
  }
}
</script>

<template>
  <div class="page-container energy-view">
    <h1 class="page-title">士气能量站</h1>

    <!-- 今日能量 -->
    <section class="card record-card">
      <h2 class="block-title">今天能量如何？</h2>

      <div class="battery-row" role="group" aria-label="能量值">
        <button
          v-for="n in 5"
          :key="n"
          class="battery"
          :class="{ selected: energy === n, [`lv${n}`]: true }"
          :aria-label="`能量 ${n}`"
          @click="energy = n"
        >
          <span class="battery-fill" :style="{ height: n * 18 + 'px' }"></span>
          <span class="battery-num num">{{ n }}</span>
        </button>
      </div>

      <div class="emotion-row">
        <button
          v-for="o in emotionOptions"
          :key="o.value"
          class="emotion-chip"
          :class="{ active: emotions.includes(o.value) }"
          @click="toggleEmotion(o.value)"
        >{{ o.label }}</button>
      </div>

      <textarea v-model="note" class="field" rows="2" placeholder="一句话记录今天（可选）"></textarea>

      <button class="btn-primary save-btn" @click="save">保存今日能量</button>
    </section>

    <!-- 能量曲线 -->
    <section class="card curve-card">
      <h2 class="block-title">近 14 天能量曲线</h2>
      <svg viewBox="0 0 280 100" class="curve-svg" role="img" aria-label="近14天能量曲线">
        <polyline :points="curvePoints" fill="none" stroke="#0891B2" stroke-width="2" stroke-linejoin="round" />
      </svg>
    </section>

    <!-- 焦虑急救箱 -->
    <section class="card rescue-card">
      <h2 class="block-title">焦虑急救箱</h2>
      <div class="rescue-grid">
        <button class="rescue-item" @click="startBreathing">
          <Icon name="battery" :size="22" />
          <span>478 呼吸</span>
          <small>吸4 · 屏7 · 呼8</small>
        </button>
        <details class="rescue-item details-item">
          <summary><Icon name="edit" :size="22" /><span>焦虑三问</span></summary>
          <div class="q-form">
            <textarea v-model="threeQuestions.worst" class="field" rows="2" placeholder="我担心的最坏结果是什么？"></textarea>
            <textarea v-model="threeQuestions.evidence" class="field" rows="2" placeholder="支持/反对它的证据？"></textarea>
            <textarea v-model="threeQuestions.actions" class="field" rows="2" placeholder="即使发生，我的三步行动？"></textarea>
          </div>
        </details>
        <button class="rescue-item" @click="takeRest">
          <Icon name="moon" :size="22" />
          <span>一键休整</span>
          <small>保命三件事</small>
        </button>
      </div>
    </section>

    <!-- 呼吸全屏 -->
    <Teleport to="body">
      <div v-if="breathing" class="breathing-overlay">
        <div class="breath-circle" aria-hidden="true"></div>
        <div class="breath-info">
          <p class="breath-phase">{{ breathPhase }}</p>
          <p class="breath-second num">{{ breathSecond }}</p>
        </div>
        <button class="btn-secondary end-btn" @click="stopBreathing">结束</button>
      </div>
    </Teleport>

    <Transition name="fade-slide">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.energy-view { display: flex; flex-direction: column; gap: var(--space-5); }
.block-title { font-size: 16px; font-weight: 600; margin-bottom: var(--space-4); }
.record-card { display: flex; flex-direction: column; gap: var(--space-4); }
.battery-row { display: flex; justify-content: space-between; gap: var(--space-2); }
.battery { position: relative; width: 44px; height: 110px; display: flex; align-items: flex-end; justify-content: center; border: 1.5px solid var(--color-gray-300); border-radius: var(--radius-sm); background: #fff; }
.battery-fill { width: 24px; background: var(--color-gray-300); border-radius: 2px; margin-bottom: 22px; transition: height var(--duration-slow) var(--ease-out), background var(--duration-fast); }
.battery-num { position: absolute; bottom: 2px; font-size: 12px; color: var(--color-gray-500); }
.battery.lv1 .battery-fill { background: var(--color-danger); }
.battery.lv2 .battery-fill { background: #f97316; }
.battery.lv3 .battery-fill { background: var(--color-warning); }
.battery.lv4 .battery-fill { background: #84cc16; }
.battery.lv5 .battery-fill { background: var(--color-success); }
.battery.selected { border-color: var(--color-primary-active); border-width: 2px; }
.emotion-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.emotion-chip { padding: var(--space-1) var(--space-3); border-radius: var(--radius-sm); border: 1px solid var(--color-border); background: #fff; color: var(--color-gray-600); font-size: 13px; }
.emotion-chip.active { background: var(--color-cyan-50); border-color: var(--color-primary-hover); color: var(--color-primary-active); }
.save-btn { align-self: flex-start; }
.curve-svg { width: 100%; height: auto; }
.rescue-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-3); }
@media (min-width:768px){ .rescue-grid { grid-template-columns: repeat(3,1fr); } }
.rescue-item { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-lg); color: var(--color-gray-700); background: var(--color-surface-1); }
.rescue-item small { font-size: 11px; color: var(--color-text-tertiary); }
.details-item { align-items: stretch; cursor: pointer; }
.details-item summary { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); list-style: none; }
.q-form { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3); width: 100%; }
.breathing-overlay { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-6); background: var(--color-bg-page); z-index: 2150; }
.breath-circle { width: 160px; height: 160px; border-radius: var(--radius-full); border: 2px solid var(--color-cyan-300); background: rgba(102,232,249,.12); animation: breath 19s linear infinite; }
@keyframes breath { 0% { transform: scale(1); } 21% { transform: scale(1.18); } 58% { transform: scale(1.18); } 100% { transform: scale(1); } }
.breath-info { text-align: center; }
.breath-phase { font-size: 18px; font-weight: 600; }
.breath-second { font-size: 40px; font-weight: 700; color: var(--color-primary-active); }
.end-btn { position: absolute; bottom: var(--space-12); }
.toast { position: fixed; top: var(--space-3); left: 50%; transform: translateX(-50%); padding: var(--space-3) var(--space-5); background: var(--color-gray-800); color: #fff; border-radius: var(--radius-md); font-size: 13px; z-index: var(--z-toast); }
</style>
