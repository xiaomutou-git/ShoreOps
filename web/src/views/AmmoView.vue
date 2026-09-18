<!--
  视图：AmmoView 知识弹药库
  核心功能：类型 Tabs、本地搜索、待复习集合、弹药卡片网格、内联编辑器与间隔复习。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAmmoStore } from '@/stores/ammo'
import type { KnowledgeItem, KnowledgeType, Mastery } from '@/types'
import Icon from '@/components/Icon.vue'

/** 弹药 store */
const ammoStore = useAmmoStore()

/** 编辑器显示 */
const editorShow = ref(false)
/** 编辑目标 */
const editing = ref<KnowledgeItem | null>(null)
/** Toast */
const toast = ref('')

/** 类型 Tabs */
const tabs: Array<{ value: KnowledgeType | 'all'; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'question', label: '题库' },
  { value: 'mistake', label: '错题' },
  { value: 'script', label: '话术' },
  { value: 'star', label: 'STAR' },
  { value: 'intel', label: '情报' }
]

/** 编辑器表单 */
const form = reactive({
  title: '',
  type: 'question' as KnowledgeType,
  tagsText: '',
  content: '',
  mastery: 'new' as Mastery
})

/**
 * 加载
 *
 * @returns {Promise<void>}
 */
onMounted(async () => {
  try {
    await ammoStore.loadAll()
  } catch (err) {
    toast.value = '加载失败'
  }
})

/**
 * 打开新建
 *
 * @returns {void}
 */
function openCreate(): void {
  editing.value = null
  form.title = ''
  form.type = 'question'
  form.tagsText = ''
  form.content = ''
  form.mastery = 'new'
  editorShow.value = true
}

/**
 * 打开编辑
 *
 * @param {KnowledgeItem} item - 弹药
 * @returns {void}
 */
function openEdit(item: KnowledgeItem): void {
  editing.value = item
  form.title = item.title
  form.type = item.type
  form.tagsText = item.tags.join(',')
  form.content = item.content
  form.mastery = item.mastery
  editorShow.value = true
}

/**
 * 保存
 *
 * @returns {Promise<void>}
 */
async function save(): Promise<void> {
  if (!form.title.trim()) {
    toast.value = '请填写标题'
    return
  }
  const tags = form.tagsText
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
  try {
    if (editing.value) {
      await ammoStore.updateKnowledge(editing.value.id, {
        title: form.title.trim(),
        type: form.type,
        tags,
        content: form.content,
        mastery: form.mastery
      })
    } else {
      await ammoStore.addKnowledge({
        title: form.title.trim(),
        type: form.type,
        tags,
        content: form.content,
        mastery: form.mastery
      })
    }
    editorShow.value = false
  } catch (err) {
    toast.value = '保存失败'
  }
}

/**
 * 删除
 *
 * @param {string} id - id
 * @returns {Promise<void>}
 */
async function remove(id: string): Promise<void> {
  try {
    await ammoStore.removeKnowledge(id)
  } catch (err) {
    toast.value = '删除失败'
  }
}

/**
 * 完成一次复习
 *
 * @param {string} id - id
 * @returns {Promise<void>}
 */
async function review(id: string): Promise<void> {
  try {
    await ammoStore.advanceReview(id)
    toast.value = '已推进复习'
  } catch (err) {
    toast.value = '复习更新失败'
  }
}

/** 类型图标映射 */
const typeIcon: Record<string, string> = {
  question: 'pen',
  mistake: 'alert',
  script: 'users',
  star: 'star',
  intel: 'info'
}
/** 掌握度中文 */
const masteryText: Record<string, string> = {
  new: '未掌握',
  reviewing: '复习中',
  mastered: '已掌握'
}
</script>

<template>
  <div class="page-container ammo-view">
    <header class="ammo-header">
      <h1 class="page-title">弹药库</h1>
      <button class="btn-primary" @click="openCreate">
        <Icon name="plus" :size="16" /> 新弹药
      </button>
    </header>

    <!-- 待复习 -->
    <section v-if="ammoStore.dueReviews.length" class="due-banner">
      <Icon name="clock" :size="18" />
      <span>今日有 <b class="num">{{ ammoStore.dueReviews.length }}</b> 张弹药待复习</span>
    </section>

    <!-- 搜索 + Tabs -->
    <div class="toolbar">
      <div class="search-box">
        <Icon name="search" :size="16" />
        <input v-model="ammoStore.keyword" type="search" placeholder="仅搜索本地弹药" aria-label="搜索弹药" />
      </div>
    </div>
    <div class="tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.value"
        role="tab"
        class="tab"
        :class="{ active: ammoStore.filterType === t.value }"
        @click="ammoStore.filterType = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 卡片网格 -->
    <div class="ammo-grid">
      <article v-for="item in ammoStore.filteredItems" :key="item.id" class="ammo-card card">
        <div class="ammo-top">
          <span class="ammo-icon">
            <Icon :name="typeIcon[item.type]" :size="18" />
          </span>
          <h2 class="ammo-title">{{ item.title }}</h2>
        </div>
        <p class="ammo-content">{{ item.content || item.tags.join(' ') || '暂无正文' }}</p>
        <div class="ammo-tags">
          <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="tag-chip">{{ tag }}</span>
        </div>
        <div class="ammo-foot">
          <span class="mastery" :class="item.mastery">{{ masteryText[item.mastery] }}</span>
          <div class="foot-actions">
            <button
              v-if="item.nextReviewAt && item.nextReviewAt <= new Date().toISOString().slice(0,10)"
              class="btn-text"
              @click="review(item.id)"
            >复习</button>
            <button class="btn-text" @click="openEdit(item)"><Icon name="edit" :size="14" /></button>
            <button class="btn-text danger" @click="remove(item.id)"><Icon name="trash" :size="14" /></button>
          </div>
        </div>
      </article>
      <p v-if="!ammoStore.filteredItems.length" class="empty-hint">还没有弹药，点击右上角沉淀第一条</p>
    </div>

    <!-- 编辑器 -->
    <Teleport to="body">
      <div v-if="editorShow" class="overlay" @click.self="editorShow = false">
        <div class="editor-panel" role="dialog" aria-modal="true" aria-label="弹药编辑">
          <div class="editor-head">
            <h3>{{ editing ? '编辑弹药' : '新增弹药' }}</h3>
            <button aria-label="关闭" @click="editorShow = false"><Icon name="x" :size="18" /></button>
          </div>
          <div class="editor-body">
            <label class="item">
              <span class="form-label">标题</span>
              <input v-model="form.title" class="field" type="text" />
            </label>
            <div class="two">
              <label class="item">
                <span class="form-label">类型</span>
                <select v-model="form.type" class="field">
                  <option v-for="t in tabs.slice(1)" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </label>
              <label class="item">
                <span class="form-label">掌握度</span>
                <select v-model="form.mastery" class="field">
                  <option value="new">未掌握</option>
                  <option value="reviewing">复习中</option>
                  <option value="mastered">已掌握</option>
                </select>
              </label>
            </div>
            <label class="item">
              <span class="form-label">标签（逗号分隔）</span>
              <input v-model="form.tagsText" class="field" type="text" placeholder="Java, 项目" />
            </label>
            <label class="item">
              <span class="form-label">正文（Markdown）</span>
              <textarea v-model="form.content" class="field" rows="6"></textarea>
            </label>
          </div>
          <div class="editor-foot">
            <button class="btn-secondary" @click="editorShow = false">取消</button>
            <button class="btn-primary" @click="save">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Transition name="fade-slide">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.ammo-view { display: flex; flex-direction: column; gap: var(--space-5); }
.ammo-header { display: flex; align-items: center; justify-content: space-between; }
.due-banner { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); background: var(--color-warning-bg); color: var(--color-warning-text); border-radius: var(--radius-md); font-size: 13px; }
.toolbar { display: flex; }
.search-box { flex: 1; display: flex; align-items: center; gap: var(--space-2); max-width: 360px; height: 40px; padding: 0 var(--space-3); background: var(--color-gray-100); border-radius: var(--radius-md); color: var(--color-gray-500); }
.search-box input { flex: 1; border: none; background: none; font-size: 14px; }
.search-box input:focus { outline: none; }
.tabs { display: flex; gap: var(--space-1); border-bottom: 1px solid var(--color-border); overflow-x: auto; }
.tab { padding: var(--space-2) var(--space-3); color: var(--color-gray-500); font-size: 14px; border-bottom: 2px solid transparent; white-space: nowrap; }
.tab.active { color: var(--color-gray-900); border-bottom-color: var(--color-primary-hover); font-weight: 500; }
.ammo-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-4); }
@media (min-width: 768px) { .ammo-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1280px) { .ammo-grid { grid-template-columns: repeat(3, 1fr); } }
.ammo-card { display: flex; flex-direction: column; gap: var(--space-3); }
.ammo-top { display: flex; align-items: center; gap: var(--space-2); }
.ammo-icon { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: var(--color-cyan-50); color: var(--color-primary-active); border-radius: var(--radius-md); }
.ammo-title { font-size: 15px; font-weight: 600; }
.ammo-content { font-size: 13px; color: var(--color-gray-600); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; min-height: 20px; }
.ammo-tags { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.tag-chip { padding: 1px var(--space-2); background: var(--color-gray-50); border-radius: var(--radius-sm); font-size: 12px; color: var(--color-gray-600); }
.ammo-foot { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.mastery { font-size: 12px; padding: 2px var(--space-2); border-radius: var(--radius-sm); background: var(--color-gray-100); color: var(--color-gray-600); }
.mastery.mastered { background: var(--color-success-bg); color: var(--color-success-text); }
.foot-actions { display: flex; }
.danger { color: var(--color-danger-text); }
.empty-hint { grid-column: 1/-1; text-align: center; font-size: 13px; color: var(--color-text-tertiary); padding: var(--space-6); }
.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding: var(--space-4); background: rgba(18,24,29,.45); backdrop-filter: blur(2px); z-index: var(--z-modal); }
.editor-panel { width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }
.editor-head { display: flex; align-items: center; justify-content: space-between; padding: var(--space-5); color: var(--color-gray-500); }
.editor-body { display: flex; flex-direction: column; gap: var(--space-4); padding: 0 var(--space-5) var(--space-4); }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.editor-foot { display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-4) var(--space-5) var(--space-5); border-top: 1px solid var(--color-border); }
.toast { position: fixed; top: var(--space-3); left: 50%; transform: translateX(-50%); padding: var(--space-3) var(--space-5); background: var(--color-gray-800); color: #fff; border-radius: var(--radius-md); font-size: 13px; z-index: var(--z-toast); }
</style>
