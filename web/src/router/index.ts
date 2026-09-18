/**
 * @file 路由配置
 * @description 定义引导页与八大模块路由，全局守卫负责在未建立战役时重定向到引导页。
 * 创建时间：2026-09-18
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'

/** 路由表 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('@/views/OnboardingView.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/map',
      name: 'map',
      component: () => import('@/views/MapView.vue')
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: () => import('@/views/TasksView.vue')
    },
    {
      path: '/funnel',
      name: 'funnel',
      component: () => import('@/views/FunnelView.vue')
    },
    {
      path: '/ammo',
      name: 'ammo',
      component: () => import('@/views/AmmoView.vue')
    },
    {
      path: '/energy',
      name: 'energy',
      component: () => import('@/views/EnergyView.vue')
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('@/views/ReviewView.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue')
    },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

/**
 * 全局前置守卫：未建立战役且访问非公共页时跳引导页
 */
router.beforeEach((to) => {
  try {
    const app = useAppStore()
    if (!to.meta.public && app.ready && !app.hasGoal) {
      return { name: 'onboarding' }
    }
    if (to.name === 'onboarding' && app.hasGoal) {
      return { name: 'dashboard' }
    }
  } catch (err) {
    // 守卫异常不阻断导航
  }
  return true
})

export default router
