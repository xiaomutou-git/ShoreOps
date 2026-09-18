<!--
  组件：Icon 统一 SVG 图标
  核心功能：按 name 渲染线性 SVG 图标，颜色继承 currentColor，支持自定义尺寸。
  设计思路：内置离线图标字典（stroke 风格），不依赖第三方图标库与网络。
  适用场景：导航、按钮、卡片、标签等所有需要图标的位置。
  创建时间：2026-09-18
-->
<script setup lang="ts">
import { computed } from 'vue'

/**
 * 组件属性
 */
const props = withDefaults(
  defineProps<{
    /** 图标名称（见下方 ICON_PATHS 键） */
    name: string
    /** 尺寸 px（正方形） */
    size?: number
    /** 描边宽度 */
    strokeWidth?: number
  }>(),
  { size: 20, strokeWidth: 1.75 }
)

/** 图标内部图形字典（24x24，默认 fill none） */
const ICON_PATHS: Record<string, string> = {
  radar:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14"/><path d="M15 6v14"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  funnel: '<path d="M3 4h18l-7 8v7l-4 2v-9L3 4z"/>',
  box: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
  battery:
    '<rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 10v4"/><rect x="4" y="9" width="8" height="6" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  paperplane: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 22H20v-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  flame: '<path d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.5.5-2.8 1-3.5C9 9 12 8 12 2z"/>',
  medal:
    '<circle cx="12" cy="15" r="6"/><path d="M8 9 7 2h10l-1 7"/><path d="M12 12v3l2 1"/>',
  shield:
    '<path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z"/><path d="m9 12 2 2 4-4"/>',
  bolt: '<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>',
  heart:
    '<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 5a5 5 0 0 1 9.5 7c-2.5 4.5-9.5 9-9.5 9z"/>',
  'arrow-right': '<path d="M5 12h14M13 5l7 7-7 7"/>',
  alert:
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<path d="m6 4 14 8-14 8z"/>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 21h16"/>',
  flag: '<path d="M4 22V4h12l-2 4 2 4H4"/>',
  stack:
    '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>',
  star: '<path d="m12 2 3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z"/>'
}

/** 当前图标的内部 SVG 字符串（缺失时回退到靶心） */
const innerSVG = computed(
  () => ICON_PATHS[props.name] ?? ICON_PATHS.target
)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke-width="strokeWidth"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="innerSVG"
  />
</template>
