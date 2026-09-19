import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/**
 * Vite 构建配置
 * 核心用途：配置 Vue 插件、路径别名 @ 指向 src、GitHub Pages 子路径 base、vitest 单元测试环境（jsdom）
 * 说明：base 设为 '/ShoreOps/' 以适配 GitHub Pages 的子路径托管（仓库名 ShoreOps）
 */
export default defineConfig({
  base: '/ShoreOps/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    host: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
})
