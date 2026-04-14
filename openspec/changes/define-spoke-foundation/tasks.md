## 1. 基础方案

- [x] 将本提案确认为实现基线
- [x] 创建 `Next.js + React` 的初始应用结构
- [x] 定义 `Scenario` 与 `ContentItem` 的初始 PostgreSQL 数据结构
- [x] 明确信息架构：场景目录页、文章目录页、练习主舞台
- [x] 固化场景目录页与文章目录页的最小信息字段
- [x] 固化前端样式方案：`Tailwind CSS` + 少量文本交互补充样式
- [x] 固化开源、隐私与可部署原则
- [x] 固化 V1 数据库 schema 草案：`scenarios`、`content_items`、`article_progress`、`article_read_states`、`generated_drafts`
- [x] 固化后端语言与框架选型：`TypeScript` + `Next.js Route Handlers`

## 2. 内容处理流水线

- [x] 定义预置文本与生成文本的 normalize 和 segmentation 流程
- 当前已统一 normalize 流程、段落切分、缩写友好的 sentence split、speaker/meta 解析与基于原文切片的 offset 对齐校验。
- [x] 确定前端使用的 `structured_content jsonb` 结构
- [x] 明确 `structured_content` 到前端运行时节点索引的转换方式
- [x] 明确 `HoverCandidateIndex` 与 `LayoutNodeIndex` 的 V1 结构
- 当前已在运行时代码中分别建模 `HoverCandidateIndex` 与 `LayoutNodeIndex`，并保留按层级分组与 `byKey` 索引。
- [x] 预留双语翻译扩展边界，保持英文主文本树与翻译层解耦
- 当前已通过独立 `TranslationBundle` 类型与详情接口中的 `translationBundle` 预留位，将翻译层与英文主文本树解耦。
- [x] 固化预置内容导入路径：后台维护 + TypeScript 导入脚本 + dry-run/apply 模式

## 3. API

- [x] 定义场景列表、内容列表、内容详情、内容生成的 V1 路由处理器
- [x] 明确练习页使用的请求与响应结构
- [x] 明确文章进度、阅读状态与场景进度的接口边界
- [x] 固化 `ArticleReadState.hasRead` 的判定规则
- 当前规则为收到 `body_interaction` 事件后置为已读，并记录 `first_read_at` / `last_read_at`。
- [x] 固化 `GeneratedDraft` 的命名、生命周期与转正边界
- 当前已实现 create、detail、insert-to-stage、save-to-scenario、discard，并在服务端限制 `discarded -> insert/save` 与 `saved -> discard`。
- [x] 固化 V1 API contract：场景、文章目录、主舞台详情、`GeneratedDraft` 生命周期、进度接口
- 当前 TypeScript API 类型与路由已作为 V1 源口径收口到 `lib/types/api.ts`，OpenSpec 设计文档已同步当前接口形状。

## 4. 练习界面

- [x] 设计练习页组件树
- 当前主舞台已拆分出共享 `frame`、`playback hook`、`header`、`text surface`、`floating player`、`controller`、`layout` 与 `visual` 模块，但 `HoverEngine` 适配层与页面差异边界仍可继续收口。
- [x] 定义距离驱动的 paragraph / sentence / token 命中与切换规则
- [x] 确定方案 A：中心单栏舞台 + 底部播放条 + 底部收起式生成抽屉的组件职责划分
- 当前界面形态已通过 `TextStage`、`PlaybackBar`、`DraftStageSurface` 和页面编排层形成稳定职责入口。
- [x] 定义 `TextStage`、`HoverEngine`、`HighlightLayer` 的运行时边界
- 当前已提供显式 `TextStage`、`useHoverEngine` 与 `HighlightLayer` 高亮决策模块，页面层不再直接内联这些职责。
- [x] 明确 HoverEngine 的输入输出契约与状态保持规则
- 当前 `computeDistanceDrivenHover` 已补齐 `hoveredLevel`、`fromLevel`、`toLevel` 等输出字段，并与设计文档中的输入输出契约保持一致。
- [x] 固化 HoverEngine 的 `reason` 枚举与状态转移规则表
- [x] 固化段 / 句 / 词的视觉语法，以及 `hover` / `playing` 的高亮表达规则
- 当前已将层级色系、形状语法、状态强度与 hover / playing 的高亮差异固化为可测试的视觉规则模块。
- [x] 固化 `PlaybackBar` 的职责、信息密度与状态边界
- 当前底部播放区已通过显式 `PlaybackBar` 入口承接播放反馈和控制，与 `TextStage` 的 hover 选择职责分离。
- [x] 定义主舞台当前场景内的上一篇 / 下一篇导航规则
- [x] 固化主舞台边界导航规则：禁用边界按钮、不跨场景、不循环

## 5. 集成边界

- [x] 明确 `OpenWebUI` 的临时角色
- [x] 定义 OpenAI 兼容模型与 TTS 接入的 provider 边界
- 当前 LLM 与 TTS 已通过 provider 选择器进入独立适配层；V1 默认使用 `openai-compatible` 与 `minimax`，业务层不再直接拼装供应商协议。

## 6. 前端工程原则

- [x] 将舞台页与相关页面的前端工程原则补充进设计文档
- [x] 避免使用影响固定吸附布局稳定性的 magic numbers
- 当前舞台页已改为通过真实测量顶部栏与底部播放器高度来计算内容避让；后续页面也需要遵守同一原则。
- [x] 固化固定吸附 UI 的共享布局 token，避免头部、正文、草稿层、播放器各自维护一套间距常量
- 当前舞台页已抽出共享布局 token、视觉 token，并由 `app/practice/_stage` 下的共享模块统一消费。
- [x] 保持页面主组件以编排职责为主，拆分控制器、布局层、视觉层与纯函数状态派生
- 当前内容页与草稿页已共享 `frame`、`playback hook`、`controller`、`layout`、`visuals` 与纯函数适配层；页面文件主要保留页面差异与事件接线。
- [x] 在存在独立滚动容器时，统一监听真实滚动源，而非默认绑定 `window`
- 当前舞台页已修正此问题，并补充了对应测试；后续页面需沿用同一规则。
- [x] 将移动端适配与 safe area 处理视为默认约束，而不是上线前补丁
- 当前舞台页已补充 safe area 处理，但尚未形成全站统一检查项。

## 7. 代码组织原则

- [x] 将代码目录结构原则与代码编写原则补充进设计文档
- [x] 将 `practice` 域共享舞台模块从具体路由目录提升到中性共享目录
- 当前 `content-items` 与 `generated-drafts` 继续保留独立业务路由，舞台共享实现已集中到 `app/practice/_stage`。
- [x] 为内容结构规则变更提供历史数据重建路径
- 当前已提供 `rebuild-structured-content` 脚本，用于重建 `content_items` 与 `generated_drafts` 的 `normalized_text` / `structured_content`。
