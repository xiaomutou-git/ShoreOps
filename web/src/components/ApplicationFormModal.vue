<!--
  组件：ApplicationFormModal 申请新增/编辑弹窗
  核心功能：编辑申请的公司、职位、渠道、JD、薪资字段，保存回传。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { Application, ApplyChannel } from '@/types'
import Icon from '@/components/Icon.vue'

/** 组件属性 */
const props = defineProps<{
  /** 显示 */
  show: boolean
  /** 编辑目标（null 新建） */
  application: Application | null
}>()

/** 组件事件 */
const emit = defineEmits<{
  /** 关闭 */
  (e: 'close'): void
  /** 保存 */
  (e: 'save', payload: {
    companyName: string
    positionTitle: string
    channel: ApplyChannel
    jdUrl: string
    salaryMin: number
    salaryMax: number
  }): void
}>()

/** 表单 */
const form = reactive({
  companyName: '',
  positionTitle: '',
  channel: 'platform' as ApplyChannel,
  jdUrl: '',
  salaryMin: 0,
  salaryMax: 0
})
/** 错误 */
const error = reactive({ company: false, position: false })

/** 渠道选项 */
const channels: Array<{ value: ApplyChannel; label: string }> = [
  { value: 'official', label: '官网' },
  { value: 'referral', label: '内推' },
  { value: 'platform', label: '招聘平台' },
  { value: 'headhunter', label: '猎头' }
]

/**
 * 重置
 *
 * @param {Application | null} app - 申请
 * @returns {void}
 */
function reset(app: Application | null): void {
  form.companyName = app?.companyName ?? ''
  form.positionTitle = app?.positionTitle ?? ''
  form.channel = app?.channel ?? 'platform'
  form.jdUrl = app?.jdUrl ?? ''
  form.salaryMin = app?.salary.min ?? 0
  form.salaryMax = app?.salary.max ?? 0
  error.company = false
  error.position = false
}

watch(
  () => props.show,
  (v) => {
    if (v) reset(props.application)
  }
)

/**
 * 保存
 *
 * @returns {void}
 */
function handleSave(): void {
  error.company = !form.companyName.trim()
  error.position = !form.positionTitle.trim()
  if (error.company || error.position) return
  emit('save', {
    ...form,
    companyName: form.companyName.trim(),
    positionTitle: form.positionTitle.trim()
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="overlay" @click.self="emit('close')">
      <div class="panel" role="dialog" aria-modal="true" aria-label="申请编辑">
        <div class="panel-head">
          <h3>{{ application ? '编辑申请' : '新增申请' }}</h3>
          <button class="icon-btn" aria-label="关闭" @click="emit('close')">
            <Icon name="x" :size="18" />
          </button>
        </div>

        <div class="panel-body">
          <label class="item">
            <span class="form-label">公司名称</span>
            <input v-model="form.companyName" class="field" type="text" placeholder="公司名" />
            <span v-if="error.company" class="field-error">请输入公司名</span>
          </label>
          <label class="item">
            <span class="form-label">职位</span>
            <input v-model="form.positionTitle" class="field" type="text" placeholder="职位名称" />
            <span v-if="error.position" class="field-error">请输入职位</span>
          </label>
          <div class="two">
            <label class="item">
              <span class="form-label">渠道</span>
              <select v-model="form.channel" class="field">
                <option v-for="c in channels" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </label>
            <label class="item">
              <span class="form-label">JD 链接</span>
              <input v-model="form.jdUrl" class="field" type="url" placeholder="https://" />
            </label>
          </div>
          <div class="two">
            <label class="item">
              <span class="form-label">薪资下限（k）</span>
              <input v-model.number="form.salaryMin" class="field" type="number" min="0" />
            </label>
            <label class="item">
              <span class="form-label">薪资上限（k）</span>
              <input v-model.number="form.salaryMax" class="field" type="number" min="0" />
            </label>
          </div>
        </div>

        <div class="panel-foot">
          <button class="btn-secondary" @click="emit('close')">取消</button>
          <button class="btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(18, 24, 29, 0.45);
  backdrop-filter: blur(2px);
  z-index: var(--z-modal);
}
.panel {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface-2);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5);
}
.icon-btn {
  color: var(--color-gray-500);
}
.panel-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 0 var(--space-5) var(--space-4);
}
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.field-error {
  margin-top: var(--space-1);
  font-size: 12px;
  color: var(--color-danger-text);
}
.panel-foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5) var(--space-5);
  border-top: 1px solid var(--color-border);
}
</style>
