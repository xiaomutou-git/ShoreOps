/**
 * @file 预置成就定义
 * @description 定义全部内置成就的 code、名称、目标值与图标语义，供成就系统初始化与进度判定使用。
 * 创建时间：2026-09-18
 */
import type { AchievementDef } from '@/types'

/**
 * 内置成就清单
 */
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { code: 'first_apply', name: '火力首投', description: '完成第 1 次投递', target: 1, icon: 'paperplane' },
  { code: 'first_written', name: '精准制导', description: '进入第 1 场笔试', target: 1, icon: 'target' },
  { code: 'first_interview', name: '初次交火', description: '完成第 1 场面试', target: 1, icon: 'users' },
  { code: 'landed', name: '登陆成功', description: '接受 Offer 成功上岸', target: 1, icon: 'flag' },
  { code: 'streak_7', name: '七日不退', description: '连续作战 7 天', target: 7, icon: 'flame' },
  { code: 'streak_100', name: '百日铁军', description: '连续作战 100 天', target: 100, icon: 'medal' },
  { code: 'apply_50', name: '弹如雨下', description: '累计投递 50 家', target: 50, icon: 'stack' },
  { code: 'review_10', name: '复盘狂人', description: '完成 10 篇面试复盘', target: 10, icon: 'refresh' },
  { code: 'counterattack', name: '绝地反击', description: '被拒次日仍完成任务', target: 1, icon: 'bolt' },
  { code: 'rebound', name: '低谷反弹', description: '连续 3 天低能量后恢复', target: 1, icon: 'heart' }
]
