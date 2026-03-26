## 1. 基础方案

- [ ] 将本提案确认为实现基线
- [ ] 创建 `Next.js + React` 的初始应用结构
- [ ] 定义 `Scenario` 与 `ContentItem` 的初始 PostgreSQL 数据结构
- [ ] 明确信息架构：场景目录页、文章目录页、练习主舞台
- [ ] 固化场景目录页与文章目录页的最小信息字段
- [ ] 固化前端样式方案：`Tailwind CSS` + 少量文本交互补充样式
- [ ] 固化开源、隐私与可部署原则
- [ ] 固化 V1 数据库 schema 草案：`scenarios`、`content_items`、`article_progress`、`article_read_states`、`generated_drafts`
- [ ] 固化后端语言与框架选型：`TypeScript` + `Next.js Route Handlers`

## 2. 内容处理流水线

- [ ] 定义预置文本与生成文本的 normalize 和 segmentation 流程
- [ ] 确定前端使用的 `structured_content jsonb` 结构
- [ ] 明确 `structured_content` 到前端运行时节点索引的转换方式
- [ ] 明确 `HoverCandidateIndex` 与 `LayoutNodeIndex` 的 V1 结构
- [ ] 预留双语翻译扩展边界，保持英文主文本树与翻译层解耦
- [ ] 固化预置内容导入路径：后台维护 + TypeScript 导入脚本 + dry-run/apply 模式

## 3. API

- [ ] 定义场景列表、内容列表、内容详情、内容生成的 V1 路由处理器
- [ ] 明确练习页使用的请求与响应结构
- [ ] 明确文章进度、阅读状态与场景进度的接口边界
- [ ] 固化 `ArticleReadState.hasRead` 的判定规则
- [ ] 固化 `GeneratedDraft` 的命名、生命周期与转正边界
- [ ] 固化 V1 API contract：场景、文章目录、主舞台详情、`GeneratedDraft` 生命周期、进度接口

## 4. 练习界面

- [ ] 设计练习页组件树
- [ ] 定义距离驱动的 paragraph / sentence / token 命中与切换规则
- [ ] 确定方案 A：中心单栏舞台 + 底部播放条 + 底部收起式生成抽屉的组件职责划分
- [ ] 定义 `TextStage`、`HoverEngine`、`HighlightLayer` 的运行时边界
- [ ] 明确 HoverEngine 的输入输出契约与状态保持规则
- [ ] 固化 HoverEngine 的 `reason` 枚举与状态转移规则表
- [ ] 固化段 / 句 / 词的视觉语法，以及 `hover` / `playing` 的高亮表达规则
- [ ] 固化 `PlaybackBar` 的职责、信息密度与状态边界
- [ ] 定义主舞台当前场景内的上一篇 / 下一篇导航规则
- [ ] 固化主舞台边界导航规则：禁用边界按钮、不跨场景、不循环

## 5. 集成边界

- [ ] 明确 `OpenWebUI` 的临时角色
- [ ] 定义 OpenAI 兼容模型与 TTS 接入的 provider 边界
