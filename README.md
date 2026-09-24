<div align="center">

# ShoreOps 上岸作战室

### 目标日倒排，每一天都朝着 Offer 开火

一款以 **D-Day 倒排作战规划** 为核心的求职指挥中枢 PWA。
本地优先、离线可用，并提供可选的零知识加密同步后端。

<br />

[![Frontend CI](https://github.com/xiaomutou-git/ShoreOps/actions/workflows/ci.yml/badge.svg)](https://github.com/xiaomutou-git/ShoreOps/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/xiaomutou-git/ShoreOps/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/xiaomutou-git/ShoreOps/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff.svg)](https://vitejs.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-10-6941b3.svg)](https://pnpm.io/)

<br />

**[在线体验](https://xiaomutou-git.github.io/ShoreOps/)** ｜ [快速开始](#快速开始) ｜ [部署指南](./docs/部署指南.md) ｜ [产品需求文档](./docs/01-PRD-上岸作战室.md) ｜ [贡献指南](./CONTRIBUTING.md)

</div>

---

<p align="center">
  <a href="#项目简介">项目简介</a> ·
  <a href="#功能亮点">功能亮点</a> ·
  <a href="#技术栈">技术栈</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#目录结构">目录结构</a> ·
  <a href="#核心模块">核心模块</a> ·
  <a href="#数据层设计">数据层</a> ·
  <a href="#同步服务接口">同步接口</a> ·
  <a href="#页面路由">页面路由</a> ·
  <a href="#质量与验证">质量与验证</a> ·
  <a href="#能力边界与路线图">能力边界</a>
</p>

---

## 项目简介

上岸作战室把「拿到 Offer」这个目标，从用户输入的目标登陆日（D-Day）倒排为 **里程碑 → 作战日任务**，并在同一款应用里统管任务执行、申请进度、知识沉淀、士气与复盘。

- **倒排规划**：内置校招 / 社招 / 转行三套模板，自动生成里程碑与每日任务，并按用户声明的「每日可投入时长」做产能装箱，避免第一天任务过载。
- **Local-First（本地优先）**：业务数据默认全部保存在浏览器 IndexedDB，无需注册、离线可用，数据不离开设备。
- **隐私同步（可选）**：提供独立的零知识加密同步后端，服务端只保存密文与 nonce，永远拿不到明文与用户密钥。
- **响应式布局**：桌面端左侧导航多列布局，移动端底部 Tab 单列布局。

## 功能亮点

| 模块 | 能力 |
| --- | --- |
| 倒计时指挥台 | D-Day 倒计时、冲刺期变色预警、总进度、今日三垒（MIT） |
| 倒排规划引擎 | 三套身份模板、里程碑 D-x 偏移、每日产能装箱、级联顺延 |
| 任务作战 | 八类任务、优先级、打卡、顺延（每日 3 次上限）、连续作战 Streak |
| 作战地图 | 里程碑纵向时间线、阶段色带、关联任务完成率、整体顺延 |
| 申请漏斗 | 六阶段看板、停留天数预警、只增事件流、小样本保护的转化率 |
| 知识弹药库 | 五类弹药、标签搜索、掌握度、间隔重复复习（1/3/7/15/30 天） |
| 士气能量站 | 五档能量、情绪标签、14 天曲线、478 呼吸引导、焦虑三问 |
| 复盘作战室 | 每日三问、四项 KPI、规则引擎瓶颈诊断（样本不足不下结论） |
| 数据自主权 | 一键导出全量 JSON 备份、勾选确认后清空、字号与动效偏好 |

## 技术栈

### 前端 `web/`

| 类别 | 技术 |
| --- | --- |
| 框架 | Vue 3（`<script setup>`）+ TypeScript |
| 构建 | Vite 5 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 本地存储 | IndexedDB（Dexie 封装） |
| 测试 | Vitest + @vue/test-utils + jsdom |
| 包管理 | pnpm |

### 后端 `server/`（可选同步服务）

| 类别 | 技术 |
| --- | --- |
| 运行时 | Node.js + TypeScript（tsx 直接运行） |
| Web 框架 | Express 4 |
| 数据库 | SQLite（sql.js，纯 WASM，零原生编译） |
| 认证 | JWT（jsonwebtoken） |
| 密码 | bcryptjs 单向哈希 |
| 参数校验 | zod |
| 安全 | helmet 安全头、cors、express-rate-limit 限流 |

## 快速开始

> [!NOTE]
> 在线版本无需安装：<https://xiaomutou-git.github.io/ShoreOps/>
> Push 到 `main` 分支即会自动部署到 GitHub Pages。

环境要求：Node.js 18+、pnpm 10+。

### 前端

```powershell
cd web
pnpm install
pnpm dev      # 本地开发：http://localhost:5173
pnpm test     # 单元测试
pnpm build    # 类型检查 + 生产构建
```

### 后端（可选加密同步服务）

```powershell
cd server
pnpm install
pnpm start    # http://localhost:4000
```

> [!WARNING]
> 生产部署必须通过环境变量配置：`PORT`、`JWT_SECRET`（至少 32 位）、`CORS_ORIGIN`（来源白名单）、`DB_PATH`。
> 切勿将默认密钥或真实密钥提交到仓库。

详细部署步骤见 [docs/部署指南.md](./docs/部署指南.md)。

## 目录结构

```text
ShoreOps/
├── .github/workflows/        # CI 与 GitHub Pages 部署流水线
├── docs/                     # 产品与过程文档
│   ├── 01-PRD-上岸作战室.md
│   ├── 02-UI设计规范.md
│   ├── 03-渗透测试报告.md
│   ├── 04-刁钻用户评价.md
│   ├── 05-反馈甄别与优化方案.md
│   ├── 06-论坛发布帖.md
│   └── 部署指南.md
├── web/                      # 前端 PWA
│   ├── src/
│   │   ├── components/       # 通用组件
│   │   ├── data/             # 成就等静态数据
│   │   ├── db/               # IndexedDB 数据访问层
│   │   ├── router/           # 路由与守卫
│   │   ├── stores/           # Pinia 状态
│   │   ├── styles/           # 设计 Token 与全局样式
│   │   ├── types/            # 全局 TS 类型
│   │   ├── utils/            # 倒排算法、日期、ID 工具
│   │   ├── views/            # 9 个页面
│   │   ├── App.vue
│   │   └── main.ts
│   └── tests/                # Vitest 单元测试
├── server/                   # 可选加密同步后端
│   └── src/
│       ├── db/               # SQLite 连接与建表
│       ├── middleware/       # 认证、校验、错误处理
│       ├── routes/           # 认证与同步接口
│       ├── utils/            # 密码哈希、JWT、错误
│       ├── app.ts            # Express 组装
│       └── index.ts          # 启动入口
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## 核心模块

<details>
<summary><b>1. 启动引导 OnboardingView</b></summary>

三步完成战役部署：欢迎（含隐私承诺）→ 身份选择（校招 / 社招 / 转行）→ 目标设定。

- 目标设定采集：目标岗位、目标城市、D-Day、每周可作战天数、**每日可投入小时数**。
- D-Day 早于次日不可提交；距 D-Day 不足 7 天时给出柔性压缩提示。
- 提交后调用倒排算法生成里程碑与任务并写入 IndexedDB。

</details>

<details>
<summary><b>2. 倒排规划算法 utils/planner.ts</b></summary>

产品核心逻辑，纯函数、可离线、可单测。

- 内置三套里程碑模板：社招 7 个、校招 7 个、转行 8 个，每个里程碑挂载标准任务包。
- 里程碑日期 = D-Day 减去模板偏移天数（D-x）。
- `enforceDailyCapacity` 按每日产能做任务装箱：首日留 20% 缓冲，超出产能的任务自动顺延到后续作战日。
- `cascadeShift` 支持从某里程碑起整体顺延（已完成任务不动）。

</details>

<details>
<summary><b>3. 指挥台 DashboardView</b></summary>

登录后的首页，集中展示：

- **倒计时卡片** `CountdownHero`：距 D-Day 天数、目标岗位 / 城市、总进度条；冲刺期（≤7 天）琥珀、紧急（≤3 天）红色；无目标时显示空状态与「去设定」入口。
- **状态卡**：连续作战天数、今日能量、战备值（弹药数 / 待复习数）。
- **今日三垒（MIT）**：最多 3 个置顶任务 + 空坑快速添加。
- **今日其他任务**与**战场态势**（漏斗 6 阶段数量概览）。

</details>

<details>
<summary><b>4. 任务模块 TasksView / TaskCard / TaskFormModal</b></summary>

- 任务字段：标题、类型（投递 / 简历 / 刷题 / 面试 / 复盘 / 学习 / 人脉 / 休整）、优先级、预估时长、截止日期、备注。
- 支持打卡完成（卡片变灰 + 删除线）、编辑、新增、顺延到明天（每日上限 3 次）。
- 连续作战天数 Streak 按「当天至少完成一件」计算；今日战报显示完成 X/Y。

</details>

<details>
<summary><b>5. 作战地图 MapView</b></summary>

- 纵向时间线展示里程碑，按战役阶段着色带，显示计划日期、D-x 偏移、关键交付物与关联任务完成率。
- 点击里程碑展开关联任务；支持「从此处整体顺延 7 天」（级联更新里程碑与任务）。

</details>

<details>
<summary><b>6. 申请漏斗 FunnelView / ApplicationFormModal</b></summary>

- 六个阶段：意向 → 已投递 → 笔试 → 面试 → Offer → 已结束。
- 申请卡片展示公司、职位、渠道、停留天数（5 天黄色 / 10 天红色预警，规则可配置）。
- 阶段切换通过下拉选择完成（同时是拖拽操作的键盘无障碍替代）；每次换列在事务内更新申请并追加一条只增不改的 `StageEvent` 事件。
- 转化率（投→笔、笔→面、面→Offer、投→Offer）仅在**终态样本 ≥ 5** 时显示，否则提示样本积累中，避免小样本伪精确。
- 支持查看申请的事件时间线、关闭申请（需指定原因）。

</details>

<details>
<summary><b>7. 知识弹药库 AmmoView</b></summary>

- 五类弹药：题库、错题、话术、STAR 素材、公司情报。
- 支持类型 Tabs、本地关键字搜索、标签、掌握度（未掌握 / 复习中 / 已掌握）。
- 题库类条目采用间隔重复（1/3/7/15/30 天），可手动推进复习阶段；首页统计「今日待复习」数量。

</details>

<details>
<summary><b>8. 士气能量站 EnergyView</b></summary>

- 每日能量记录：1–5 五档电池选择 + 多选情绪标签（最多 3 个）+ 一句话日记。
- 近 14 天能量曲线（SVG polyline）。
- 焦虑急救箱：478 呼吸全屏引导（吸 4 秒 / 屏 7 秒 / 呼 8 秒，可随时结束）、焦虑三问（本地记录）、一键休整（生成休整任务）。

</details>

<details>
<summary><b>9. 复盘作战室 ReviewView</b></summary>

- 每日三问：今天推进了什么、最大卡点、明日最重要的一件事，按日期持久化。
- 数据洞察：在管申请、Offer 数、连续作战、今日完成率四项 KPI；规则引擎在满足条件时给出瓶颈诊断（如简历通过率偏低、连续 3 天低能量等），样本不足时不显示结论。

</details>

<details>
<summary><b>10. 个人中心 ProfileView</b></summary>

- 战役管理：暂停 / 恢复、标记已上岸。
- 本地数据：各实体条数统计、一键导出全量 JSON 备份、清空全部数据（需勾选确认，不可恢复）。
- 外观：三档字号、减弱动效开关。
- 隐私说明：明示数据仅存本设备。

</details>

## 数据层设计

前端使用 IndexedDB（Dexie），核心表包括：

`profiles`、`goals`、`milestones`、`tasks`、`applications`、`stageEvents`、`interviews`、`interviewReviews`、`dailyReviews`、`moodLogs`、`knowledgeItems`、`userAchievements`、`settings`。

- 所有业务实体带统一审计字段：`id / createdAt / updatedAt / deletedAt`。
- `stageEvents` 为只追加事件流，是申请时间线与转化率的唯一事实来源。
- 阶段换列等多表操作使用 Dexie 事务保证原子性。
- 启动时自动初始化默认设置与成就占位记录。

## 同步服务接口

零知识架构：前端加密后把密文上送，服务端不持有密钥、无法解密。

| 方法 | 路径 | 说明 | 认证 |
| --- | --- | --- | --- |
| GET | `/api/health` | 健康检查 | 否 |
| POST | `/api/auth/register` | 邮箱注册（bcrypt 哈希） | 否 |
| POST | `/api/auth/login` | 登录签发 JWT | 否 |
| GET | `/api/auth/me` | 当前用户信息 | 是 |
| GET | `/api/sync/vault` | 拉取本人密文 | 是 |
| PUT | `/api/sync/vault` | 上传 / 更新密文（版本自增） | 是 |
| DELETE | `/api/sync/vault` | 删除本人密文 | 是 |

安全措施：

- 所有 SQL 使用预编译参数绑定；JWT 解析出的 `userId` 作为数据隔离唯一依据（防 IDOR）。
- helmet 安全响应头、CORS、全局限流（300 次 / 15 分钟）与认证接口限流（20 次 / 15 分钟）。
- 统一错误处理：非法 JSON 返回 400、请求体过大 413、编码错误 415；生产环境隐藏堆栈。

## 页面路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/onboarding` | 启动引导 | 无目标时进入 |
| `/` | 指挥台 | 首页 |
| `/map` | 作战地图 | 里程碑时间线 |
| `/tasks` | 任务 | 今日任务与战报 |
| `/funnel` | 申请漏斗 | 六阶段管理 |
| `/ammo` | 弹药库 | 知识沉淀 |
| `/energy` | 能量站 | 心情与急救 |
| `/review` | 复盘室 | 每日三问与洞察 |
| `/profile` | 我的 | 数据与外观 |

路由守卫在 Pinia 激活后、数据初始化完成时判断：无战役目标自动跳转到引导页。

## 质量与验证

- 前端 **19 个单元测试全部通过**，覆盖倒排算法（模板、作战星期、里程碑日期、级联顺延、每日产能约束）、日期工具、ID 工具、任务卡组件。
- `pnpm build` 通过 vue-tsc 严格类型检查并成功产出生产包。
- 已完成黑盒 + 白盒渗透测试，SQL 注入、越权 IDOR、伪造 JWT、XSS 均未发现可利用漏洞；测试中发现的「非法 JSON 返回 500」等缺陷已修复，详见 [03-渗透测试报告](./docs/03-渗透测试报告.md)。

## 能力边界与路线图

- 申请阶段切换当前为下拉选择，桌面端拖拽看板尚未实现。
- 作战地图为纵向时间线，甘特视图尚未实现。
- 成就勋章目前为数据初始化与部分统计，勋章墙 UI 与完整解锁动效尚未完整呈现。
- 加密同步后端已可用，但密钥派生、前端加密上送与一键开通流程尚未接入前端界面；前端默认完全本地使用。
- 面试复盘的完整结构化表单、PWA Service Worker 离线壳尚未接入（当前为普通响应式网页 + 本地存储，断网后已写入的数据仍可读，刷新需在能加载应用资源时进行）。

> [!TIP]
> 完整产品规划见 [01-PRD-上岸作战室](./docs/01-PRD-上岸作战室.md)，迭代取舍与反馈甄别见 [05-反馈甄别与优化方案](./docs/05-反馈甄别与优化方案.md)，UI 规范见 [02-UI设计规范](./docs/02-UI设计规范.md)。

## 贡献

欢迎通过 Issue 反馈问题、通过 Pull Request 参与改进。提交前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，提交信息建议使用 `feat:` / `fix:` / `docs:` 等约定式前缀。

## 许可证

基于 [MIT License](./LICENSE) 开源发布。

---

<div align="center">

<sub>Built with Vue 3 · TypeScript · Vite — ShoreOps 上岸作战室</sub>

</div>
