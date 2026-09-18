<!--
  组件：AppSidebar 桌面端左侧导航
  核心功能：展示 Logo、八大模块导航、离线状态；激活态浅青底+左缘竖条。
  适用场景：≥768px（主要桌面）显示。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'

/** 导航项定义 */
const navItems = [
  { name: 'dashboard', label: '指挥台', icon: 'radar' },
  { name: 'map', label: '作战地图', icon: 'map' },
  { name: 'tasks', label: '任务', icon: 'target' },
  { name: 'funnel', label: '漏斗看板', icon: 'funnel' },
  { name: 'ammo', label: '弹药库', icon: 'box' },
  { name: 'energy', label: '能量站', icon: 'battery' },
  { name: 'review', label: '复盘室', icon: 'refresh' },
  { name: 'profile', label: '我的', icon: 'user' }
]

/** 当前路由 */
const route = useRoute()
</script>

<template>
  <aside class="sidebar">
    <div class="logo-row">
      <Icon name="radar" :size="24" />
      <span class="logo-text">上岸作战室</span>
    </div>

    <nav class="nav-list" aria-label="主导航">
      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="nav-item"
        :class="{ active: route.name === item.name }"
      >
        <Icon :name="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar-footer">
      <span class="offline-dot" aria-hidden="true"></span>
      <span class="offline-text">本地运行中 · 离线可用</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  background: var(--color-surface-1);
  border-right: 1px solid var(--color-border);
  z-index: var(--z-sticky);
}
.logo-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 56px;
  padding: 0 var(--space-5);
  color: var(--color-primary-hover);
}
.logo-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.nav-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-gray-600);
  font-size: 14px;
  transition: background var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out);
}
@media (hover: hover) {
  .nav-item:hover {
    background: var(--color-gray-50);
  }
}
.nav-item.active {
  background: var(--color-cyan-50);
  color: var(--color-primary-active);
  font-weight: 500;
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: var(--radius-xs);
  background: var(--color-primary-hover);
}
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
}
.offline-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-success);
}
.offline-text {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
