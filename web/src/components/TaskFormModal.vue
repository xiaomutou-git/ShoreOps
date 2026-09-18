<!--
  组件：TaskFormModal 任务新增/编辑弹窗
  核心功能：在模态中编辑任务核心字段，保存时回传字段补丁。
  交互：Esc/遮罩关闭；新建时默认今日；标题必填。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Task, TaskType, Priority } from '@/types'
import { todayISO } from '@/utils/date'
import Icon from '@/components/Icon.vue'

/** 组件属性 */
const props = defineProps<{
  /** 是否显示 */
  show: boolean
  /** 待编辑任务（null 表示新建） */
  task: Task | null
}>()

/** 组件事件 */
const emit = defineEmits<{
  /** 关闭 */
  (e: 'close'): void
  /** 保存，回传字段补丁（新建时无 id 信息） */
  (e: 'save', payload: {
    title: string
    type: TaskType
    priority: Priority
    estimateMinutes: number
    dueDate: string
    note: string
  }): void
}>()

/** 表单数据 */
const form = reactive({
  title: '',
  type: 'study' as TaskType,
  priority: 'medium' as Priority,
  estimateMinutes: 30,
  dueDate: todayISO(),
  note: ''
})
/** 标题错误 */
const titleError = ref('')

/** 类型选项 */
const typeOptions: Array<{ value: TaskType; label: string }> = [
  { value: 'apply', label: '投递' },
  { value: 'resume', label: '简历' },
  { value: 'drill', label: '刷题' },
  { value: 'interview', label: '面试' },
  { value: 'review', label: '复盘' },
  { value: 'study', label: '学习' },
  { value: 'network', label: '人脉' },
  { value: 'rest', label: '休整' }
]
/** 优先级选项 */
const priorityOptions: Array<{ value: Priority; label: string }> = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
]
/** 时长选项 */
const durationOptions = [15, 30, 60, 120]

/**
 * 重置表单为给定任务或默认值
 *
 * @param {Task | null} task - 任务
 * @returns {void}
 */
function resetForm(task: Task | null): void {
  form.title = task?.title ?? ''
  form.type = task?.type ?? 'study'
  form.priority = task?.priority ?? 'medium'
  form.estimateMinutes = task?.estimateMinutes ?? 30
  form.dueDate = task?.dueDate ?? todayISO()
  form.note = task?.note ?? ''
  titleError.value = ''
}

watch(
  () => props.show,
  (visible) => {
    if (visible) resetForm(props.task)
  }
)

/**
 * 提交保存（校验标题）
 *
 * @returns {void}
 */
function handleSave(): void {
  if (!form.title.trim()) {
    titleError.value = '请输入任务标题'
    return
  }
  emit('save', { ...form, title: form.title.trim() })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-panel" role="dialog" aria-modal="true" aria-label="任务编辑">
        <div class="modal-header">
          <h3 class="modal-title">{{ task ? '编辑任务' : '新增任务' }}</h3>
          <button class="icon-btn" aria-label="关闭" @click="emit('close')">
            <Icon name="x" :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <label class="form-item">
            <span class="form-label">任务标题</span>
            <input v-model="form.title" class="field" type="text" placeholder="今天要做什么？" />
            <span v-if="titleError" class="field-error">{{ titleError }}</span>
          </label>

          <div class="two-col">
            <label class="form-item">
              <span class="form-label">类型</span>
              <select v-model="form.type" class="field">
                <option v-for="o in typeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label">优先级</span>
              <select v-model="form.priority" class="field">
                <option v-for="o in priorityOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </label>
          </div>

          <div class="two-col">
            <label class="form-item">
              <span class="form-label">预估时长</span>
              <select v-model.number="form.estimateMinutes" class="field">
                <option v-for="d in durationOptions" :key="d" :value="d">{{ d }} 分钟</option>
              </select>
            </label>
            <label class="form-item">
              <span class="form-label">截止日期</span>
              <input v-model="form.dueDate" class="field" type="date" />
            </label>
          </div>

          <label class="form-item">
            <span class="form-label">备注</span>
            <textarea v-model="form.note" class="field" rows="2"></textarea>
          </label>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="emit('close')">取消</button>
          <button class="btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
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
.modal-panel {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface-2);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5);
}
.modal-title {
  font-size: 17px;
  font-weight: 600;
}
.icon-btn {
  color: var(--color-gray-500);
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 0 var(--space-5) var(--space-4);
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.field-error {
  margin-top: var(--space-1);
  font-size: 12px;
  color: var(--color-danger-text);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5) var(--space-5);
  border-top: 1px solid var(--color-border);
}
</style>
