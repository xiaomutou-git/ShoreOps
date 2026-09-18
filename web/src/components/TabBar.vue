<!--
  组件：TabBar 移动端底部导航
  核心功能：固定 5 个 Tab（指挥台/任务/漏斗/能量/我的），激活态面性青色。
  适用场景：<768px 显示，高度含安全区。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'

/** 移动 Tab 项（仅 5 个） */
const tabs = [
  { name: 'dashboard', label: '指挥台', icon: 'radar' },
  { name: 'tasks', label: '任务', icon: 'target' },
  { name: 'funnel', label: '漏斗', icon: 'funnel' },
  { name: 'energy', label: '能量', icon: 'battery' },
  { name: 'profile', label: '我的', icon: 'user' }
]

/** 当前路由 */
const route = useRoute()
</script>

<template>
  <nav class="tabbar" aria-label="底部导航">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="tab-item"
      :class="{ active: route.name === tab.name }"
    >
      <Icon :name="tab.icon" :size="24" />
      <span class="tab-label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: none;
  height: calc(var(--tabbar-height) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(251, 252, 253, 0.92);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--color-border);
  z-index: var(--z-sticky);
}
/* 仅移动端显示底部 Tab，桌面由侧栏承担导航 */
@media (max-width: 767px) {
  .tabbar {
    display: flex;
  }
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--color-gray-400);
}
.tab-label {
  font-size: 10px;
}
.tab-item.active {
  color: var(--color-primary-active);
}
</style>
