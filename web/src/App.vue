<!--
  组件：App 根组件
  核心功能：根据初始化状态显示加载态；按视口组织桌面侧栏/移动 Tab 与主内容区。
  设计思路：引导页全屏不套布局；其余页面共享响应式应用框架。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import AppSidebar from '@/components/AppSidebar.vue'
import TabBar from '@/components/TabBar.vue'
import Icon from '@/components/Icon.vue'

/** 全局应用状态 */
const appStore = useAppStore()
/** 当前路由 */
const route = useRoute()

/** 是否为全屏引导页 */
const isFullscreen = computed(() => route.name === 'onboarding')
</script>

<template>
  <div v-if="!appStore.ready" class="boot-screen" role="status" aria-live="polite">
    <Icon name="radar" :size="40" class="boot-icon" />
    <p class="boot-text">正在部署作战室…</p>
  </div>

  <template v-else>
    <AppSidebar v-if="!isFullscreen" />
    <main class="main-area" :class="{ fullscreen: isFullscreen }">
      <RouterView v-slot="{ Component }">
        <Transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <TabBar v-if="!isFullscreen" />
  </template>
</template>

<style scoped>
.boot-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  background: var(--color-bg-page);
}
.boot-icon {
  color: var(--color-primary-hover);
}
.boot-text {
  font-size: 14px;
  color: var(--color-text-tertiary);
}
.main-area {
  min-height: 100vh;
  padding-bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom));
}
/* 桌面：左留侧栏宽度 */
@media (min-width: 768px) {
  .main-area {
    margin-left: var(--sidebar-width);
    padding-bottom: 0;
  }
}
.main-area.fullscreen {
  margin-left: 0;
  padding-bottom: 0;
}
</style>
