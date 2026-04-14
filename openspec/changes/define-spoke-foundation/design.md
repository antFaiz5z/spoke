# 设计：Spoke 基础方案

## 产品边界

主产品链路为：

```text
Scenario -> Content Item -> Paragraph / Sentence / Token -> Hover / Click -> TTS
```

这意味着系统主形态应当是一个结构化文档练习界面，而不是一个消息线程界面。

## 当前实现对齐

截至 2026-03-31，代码实现与本设计的大体对齐情况如下：

- 已落地：`Next.js App Router` 应用骨架、`PostgreSQL` schema、场景目录页、文章目录页、练习主舞台、`generated_drafts` 基础生命周期、文章进度与已读状态接口。
- 已落地：`structured_content` 的 V1 树结构、前端运行时节点索引、`HoverCandidateIndex` / `LayoutNodeIndex`、基于布局矩形的距离驱动 hover 计算、TTS provider 边界下的 MiniMax 播放链路。
- 部分落地：内容处理流水线目前只覆盖最小可用版本，已支持 normalize、段落切分和基础 token 切分，但真正的 sentence split、speaker 解析、offset 校验和翻译层扩展边界仍未完成。
- 已落地：主舞台形态已经收口为“中心单栏舞台 + 底部播放区 + 生成抽屉”，并通过显式 `TextStage`、`HoverEngine`、`HighlightLayer`、`PlaybackBar` 边界保持页面编排层与运行时职责分离。
- 已落地：`GeneratedDraft` 已支持创建、查看、插入预览舞台、保存为正式 `ContentItem` 与显式 discard；服务端已限制 `discarded` 不能再插入或保存，`saved` 不能再 discard。
- 已落地：provider layer 已抽象为独立适配边界；当前 V1 默认通过 `openai-compatible` 生成 provider 和 `minimax` TTS provider 运行，后续替换供应商时不需要改业务调用层。

## 信息架构

已确认 V1 产品信息架构分为三层：

```text
场景目录页
  -> 文章目录页
    -> 练习主舞台
```

页面职责：

- 场景目录页
  - 浏览所有场景
  - 展示每个场景的覆盖进度
  - 进入某个场景
- 文章目录页
  - 展示当前场景下的练习材料列表
  - 展示每篇内容的阅读状态与文章进度
  - 承接生成后保存到场景数据库的内容
- 练习主舞台
  - 承载段 / 句 / 词交互
  - 承载播放反馈
  - 记录当前文章进度
  - 提供当前场景内的上一篇 / 下一篇切换

### 场景目录页最小信息字段

场景目录页用于帮助用户选择练习主题，并理解场景覆盖进度。

推荐最小字段：

```text
ScenarioCard
- title
- summary
- articleCount
- readProgress
- lastReadAt?
```

字段说明：

- `title`
  - 场景标题
- `summary`
  - 场景简介
- `articleCount`
  - 当前场景下的文章总数
- `readProgress`
  - 已阅读文章数 / 总文章数
- `lastReadAt?`
  - 最近练习时间，可选

场景目录页不应承载文章级细节、主舞台交互信息或复杂生成控制。

### 文章目录页最小信息字段

文章目录页用于帮助用户在当前场景下选择具体练习内容。

推荐最小字段：

```text
ContentItemRow
- title
- contentKind
- difficultyLevel
- hasRead
- farthestParagraphIndex
- sourceType
- updatedAt?
```

字段说明：

- `title`
  - 练习内容标题
- `contentKind`
  - 内容类型，如 `dialogue | monologue | script | qa`
- `difficultyLevel`
  - 难度等级
- `hasRead`
  - 是否已阅读
- `farthestParagraphIndex`
  - 当前文章进度的原始存储字段，按最远 paragraph 表示
- `sourceType`
  - `preset | generated`
- `updatedAt?`
  - 最近更新时间，可选

文章目录页不应承载全文交互、token 级信息、复杂播放控制或双语细节展示。

展示层可基于 `farthestParagraphIndex` 派生出更友好的进度表达，如“已练到第 N 段”或简化进度条。

## 架构边界

推荐系统形态：

```text
spoke-web (Next.js)
  -> 内容浏览
  -> 练习界面
  -> 结构化文本片段交互
  -> TTS 请求

OpenWebUI
  -> 模型配置
  -> prompt 调试
  -> 内部操作工具

provider layer
  -> OpenAI 兼容模型接入
  -> TTS 后端适配层
```

`OpenWebUI` 被有意放在主用户路径之外，这样后续迁移到自定义后台或自定义管理系统时，不需要重构产品主界面。

当前实现约定：

- 文本生成侧通过 provider 选择器进入 `openai-compatible` 适配层，再由适配层负责协议请求与响应解析
- TTS 侧通过 provider 选择器进入 `minimax` 适配层，再由适配层负责协议请求与音频数据提取
- 业务层继续只依赖 `generateDraftText` 与 `synthesizeSpeech` 这样的稳定入口
- provider 名称通过环境变量控制，V1 默认值分别为 `OPENAI_PROVIDER=openai-compatible` 与 `TTS_PROVIDER=minimax`

## 后端语言与框架选型

V1 后端优先采用：

- `TypeScript`
- `Next.js App Router + Route Handlers`

原因：

- 当前 V1 后端职责仍以目录查询、详情聚合、生成草稿生命周期、进度写入为主
- 与前端共享 TypeScript 心智更有利于快速迭代和开源协作
- 可以降低自部署门槛，避免过早拆分独立后端服务

V1 目标：

- 页面、API、数据库访问保持在同一工程内
- 不为当前阶段过早引入独立 Java / Go / Python 主后端

后续演进路径：

- 若内容生成、文本处理、异步任务编排明显变重，可拆出独立服务
- 独立服务优先考虑：
  - `NestJS`，若希望继续保持 TypeScript 全栈一致
  - `Python + FastAPI`，若后续 NLP / 文本处理 / AI worker 显著增强

边界原则：

- V1 不单独起主后端服务
- V1 先以 `Next.js Route Handlers` 承载 API contract
- 若未来拆分服务，应保持 provider、内容处理、主站 API 的边界清晰

## 前端样式方案

V1 前端样式方案优先采用 `Tailwind CSS`，并允许少量补充性自定义样式用于文本主舞台的高亮与交互视觉。

选型原则：

- 使用 `Tailwind CSS` 负责布局、间距、排版、目录卡片、抽屉、播放条等通用界面结构
- 对 paragraph / sentence / token 的高亮、`hover` / `playing` 视觉语法，允许使用少量自定义样式层补充
- 不引入重型 UI 框架作为主界面依赖

原因：

- `Tailwind CSS` 适合状态驱动、层级清晰的 React 界面
- 对开源协作更容易保持样式约束统一
- 构建产物仍然是普通 CSS，对自部署与隐私没有额外运行时负担

约束：

- 不应把所有复用样式都堆成超长 class 字符串
- 页面布局层可直接使用 Tailwind utilities
- 可复用组件层应抽离组件职责，避免类名复制扩散
- 桌面与移动端都必须作为正式目标环境设计，不允许只在桌面尺寸下成立再事后补移动端
- 固定吸附的标题栏、播放条、抽屉与正文滚动区域必须在窄屏下保持可访问、可点击、无遮挡

## 前端工程原则

为了保证舞台页及后续页面可持续演进，前端实现需要遵守以下工程原则：

- 先保证行为鲁棒性，再做视觉微调；滚动联动、播放状态、导航状态等行为不得依赖脆弱的硬编码常数
- 固定吸附 UI 的避让空间应优先来源于真实测量或共享布局 token，而不是散落在多个组件中的 magic numbers
- 页面主组件应优先承担编排职责；播放控制、布局层、文本舞台、生成面板、图标与纯派生逻辑应拆分到独立模块
- 可复用的视觉语法应抽成共享 token 或纯函数，包括版心、间距、卡片基类、hover / playing 状态与颜色层级
- 可复用的状态派生逻辑应抽成纯函数或 controller 层，并优先补测试，再让页面消费结果
- 当页面进入固定头部、固定底部、独立滚动容器并存的形态时，滚动事件必须绑定到真实滚动容器，而不是默认绑定 `window`
- 移动端适配不是收尾工作；在设计和实现阶段就必须同时考虑 safe area、按钮可点击尺寸、吸附组件遮挡和窄屏换行
- 当单个页面文件同时承担数据派生、状态机、音频生命周期、布局渲染和视觉实现时，应视为需要继续拆分的信号

## 代码目录结构原则

为了避免业务路由目录和共享实现相互污染，`app` 与 `lib` 下的代码组织需要遵守以下目录结构原则：

- 路由目录优先表达资源语义，而不是承载跨页面共享实现。例如 `content-items` 与 `generated-drafts` 应继续作为不同业务主体保留独立路由
- 当多个业务主体共享同一套舞台、播放器、头部、布局 token、视觉 token 或播放控制逻辑时，共享模块应提升到资源无关的中性目录，而不是长期挂靠在某一个具体路由下
- 在 `app/practice` 域内，共享舞台模块应集中到类似 `_stage`、`_components` 这类私有共享目录，页面目录只保留各自页面差异和路由入口
- 目录提升的判断标准不是“文件是否复用过一次”，而是“该模块是否已经不再依赖某个单一路由语义”
- `lib` 优先承载纯函数、数据结构转换、布局索引、hover 计算、内容处理、provider 接口等与 React 视图树解耦的逻辑；`app` 优先承载路由、页面编排和 UI 组件
- 当一个目录下的文件被其他业务目录反向引用时，应优先判断是否应该提升为共享目录，而不是继续增加跨层相对导入

当前对齐实现：

- `app/practice/content-items/[id]` 与 `app/practice/generated-drafts/[id]` 继续分别表达正式内容与临时草稿两个不同主体
- 共享舞台实现已提升到 `app/practice/_stage`
- `lib/practice.ts`、`lib/content-processing.ts` 等模块继续承载与页面目录解耦的纯逻辑

## 代码编写原则

除页面交互和目录结构外，日常实现还需要遵守以下代码编写原则：

- 新增行为、修复缺陷或调整交互时，优先补对应测试或纯函数校验，再补实现，避免在缺乏行为锚点时直接改页面逻辑
- 页面组件优先消费已经成型的 controller、hook、token 和纯函数，不在组件内部重复实现同一套派生逻辑
- 共享逻辑优先抽成纯函数或可复用 hook；共享视觉优先抽成 token 或视觉 helper；避免复制一段相似 JSX 再分别维护
- 发生跨层依赖时，应优先提升模块边界，而不是让页面通过深层相对路径长期耦合到另一个路由目录
- 对现有数据结构规则有变更时，除更新运行时代码外，还应同步考虑历史数据修复脚本或重建路径，避免“新代码支持、旧数据失效”的半完成状态
- 对模型输出、TTS 输入、内容处理结果等不稳定边界，应优先增加服务端约束、校验和失败信号，而不是把清洗逻辑隐式塞进页面层
- 当一个改动已经形成稳定约束时，应同步回写到 OpenSpec 文档，而不是让规则只存在于对话或局部实现中

## 开源、隐私与可部署原则

`spoke` 预期作为可开源、可自部署产品设计，因此需要在技术边界上优先考虑隐私与部署友好性。

原则：

- 前端静态资源应支持本地打包与本地提供，不依赖外部 CDN 才能正常运行
- 主产品运行时不依赖 `OpenWebUI`
- 模型与 TTS 接入保持 OpenAI-compatible provider boundary，便于替换后端供应商
- 数据存储默认走自有 `PostgreSQL`
- 核心产品能力不绑定到不可替换的专有云服务
- 部署方式应优先支持本地或自托管环境

工程预期：

- 提供清晰的 `.env.example`
- 提供自部署所需的最小运行说明
- 保持模型、TTS、数据库等基础设施的边界清晰，便于用户替换为自有服务

## V1 内容模型

已确认的内容层级为：

```text
Scenario
  ContentItem
    Paragraph
      Sentence
        Token
```

### Scenario

表示用户可见的场景入口，例如：

- Job Interview
- Workplace Meeting
- Travel
- Ordering Food

V1 字段：

- `id`
- `slug`
- `title`
- `summary`
- `category`
- `status`
- `sort_order`

### ContentItem

表示一个可练习单元，可以是预置内容，也可以是生成内容。

V1 字段：

- `id`
- `scenario_id`
- `source_type`
- `content_kind`
- `title`
- `raw_text`
- `normalized_text`
- `language`
- `difficulty_level`
- `status`
- `created_by_type`
- `generation_prompt`
- `created_at`
- `updated_at`

约定：

- `source_type`: `preset | generated`
- `content_kind`: `dialogue | monologue | qa | script`
- `status`: 可包含 `generating | processing | ready | failed | archived`

### Paragraph

Paragraph 是内容树中的第一层结构节点，并允许携带 speaker 信息。

V1 字段：

- `id`
- `content_item_id`
- `index`
- `speaker_id`
- `speaker_label`
- `text`
- `start_offset`
- `end_offset`

### Sentence

V1 字段：

- `id`
- `content_item_id`
- `paragraph_id`
- `index`
- `text`
- `start_offset`
- `end_offset`

### Token

V1 字段：

- `id`
- `content_item_id`
- `paragraph_id`
- `sentence_id`
- `index`
- `text`
- `normalized_text`
- `is_punctuation`
- `start_offset`
- `end_offset`

## 内容处理规则

预置内容和生成内容必须最终汇聚为同一种结构化文本树。

处理流水线：

```text
raw_text
  -> normalize
  -> paragraph split
  -> sentence split
  -> token split
  -> store structured_content
```

这里的分段、分句、分词属于内容处理流水线的一部分，而不是一个孤立模块。

## 预置内容导入路径

预置内容不应只依赖后台手动录入。

V1 建议同时支持两种内容进入路径：

- 后台直接写入
- 导入脚本批量写入

角色划分：

- 后台直接写入
  - 适合单条修正、小批量补录、运营维护
- 导入脚本
  - 适合批量导入预置材料
  - 适合当前开发/探索阶段快速插入内容验证主舞台表现

关键原则：

- 导入脚本是 V1 的正式内容入口之一
- 导入脚本必须复用同一条 `normalize -> paragraph split -> sentence split -> token split -> structured_content` 流水线
- 不应绕开正式内容处理逻辑直接写入非标准内容
- 脚本应支持 `dry-run` 与真正写入两种模式

工程建议：

- 预置内容导入脚本优先使用 `TypeScript`
- 保持与主工程语言一致，便于复用内容处理逻辑

## Offset 规则

所有节点偏移量都必须使用同一坐标系，并统一基于 `ContentItem.normalized_text`。

规则：

- 所有段、句、词都映射回同一份内容级文本
- `start_offset < end_offset`
- 句子范围必须完全落在所属段落范围内
- 词范围必须完全落在所属句子范围内
- 每层集合中的 `index` 应连续

## 数据库策略

主应用数据库使用 `PostgreSQL`。

V1 持久化方式：

- `Scenario` 关系化存储
- `ContentItem` 关系化存储
- 段 / 句 / 词结构树以 `jsonb` 形式存放在 `ContentItem.structured_content` 中

原因：

- 前端练习页消费的是一棵树，而不是碎片化行数据
- V1 暂不要求对整库做词级分析查询
- 用 `jsonb` 保存结构树可降低读取复杂度，避免过早规范化

如果未来细粒度查询需求显著增加，再将 `Paragraph`、`Sentence`、`Token` 规范化为独立数据表。

### V1 数据库 schema 草案

V1 主数据库对象建议收敛为以下五类：

- `scenarios`
- `content_items`
- `article_progress`
- `article_read_states`
- `generated_drafts`

其中：

- `structured_content` 存放在 `content_items` 与 `generated_drafts` 中
- 场景进度作为派生值，不单独持久化
- paragraph / sentence / token 不拆成独立关系表

#### scenarios

建议字段：

- `id`
- `slug`
- `title`
- `summary`
- `category`
- `status`
- `sort_order`
- `created_at`
- `updated_at`

约束：

- `slug` 唯一

#### content_items

建议字段：

- `id`
- `scenario_id`
- `source_type`
- `content_kind`
- `title`
- `raw_text`
- `normalized_text`
- `structured_content` (`jsonb`)
- `language`
- `difficulty_level`
- `status`
- `created_by_type`
- `generation_prompt`
- `created_at`
- `updated_at`

约束：

- `scenario_id` 外键关联 `scenarios`
- `source_type`: `preset | generated`
- `content_kind`: `dialogue | monologue | qa | script`
- `status`: `generating | processing | ready | failed | archived`

#### article_progress

建议字段：

- `id`
- `content_item_id`
- `farthest_paragraph_index`
- `last_read_at`
- `created_at`
- `updated_at`

规则：

- 主进度以 `farthest_paragraph_index` 为准
- 不与瞬时播放位置混用
- V1 作为实例级状态存储，不支持账户隔离

#### article_read_states

建议字段：

- `id`
- `content_item_id`
- `has_read`
- `first_read_at`
- `last_read_at`
- `created_at`
- `updated_at`

规则：

- 服务场景覆盖率统计
- 与文章进度语义分离
- V1 作为实例级状态存储，不支持账户隔离

#### generated_drafts

建议字段：

- `id`
- `scenario_id`
- `title`
- `raw_text`
- `normalized_text`
- `structured_content` (`jsonb`)
- `content_kind`
- `difficulty_level`
- `generation_prompt`
- `status`
- `inserted_to_stage`
- `saved_content_item_id`
- `created_at`
- `updated_at`

规则：

- `generated_drafts` 不等于正式 `content_items`
- `saved_content_item_id` 可为空
- 保存为正式内容后，可回指正式 `content_items.id`
- V1 默认按短生命周期对象处理
- 未保存草稿默认视为可丢弃对象，不进入长期管理列表

推荐关系：

```text
scenarios
  1 -> n content_items
  1 -> n generated_drafts

content_items
  1 -> 1 article_progress
  1 -> 1 article_read_states

generated_drafts
  0..1 -> saved_content_item_id -> content_items.id
```

派生对象：

- 场景进度 = 已阅读文章数 / 场景文章总数
- 不单独建表持久化

## API 原则

V1 API 分为五组：

- 场景接口
- 文章目录接口
- 主舞台详情接口
- `GeneratedDraft` 生命周期接口
- 进度接口

推荐接口：

- `GET /api/scenarios`
- `GET /api/scenarios/:slug`
- `GET /api/scenarios/:slug/content-items`
- `GET /api/content-items/:id`
- `POST /api/generated-drafts`
- `POST /api/generated-drafts/:id/insert-to-stage`
- `POST /api/generated-drafts/:id/save`
- `POST /api/generated-drafts/:id/discard`

规则：

- 列表接口仅返回元数据
- 内容详情接口一次返回完整结构树
- 预置内容与生成内容共用同一个详情接口
- 练习页应避免针对 sentence 或 token 做细粒度追加请求
- `GeneratedDraft` 需要独立于正式 `ContentItem` 的生命周期接口

系统级 contract 原则：

- 目录页接口只返回目录所需最小信息
- 主舞台详情接口一次返回正文树、进度和导航上下文
- `GeneratedDraft` 与正式 `ContentItem` 分开建模
- 文章进度与已阅读状态分开建模
- 场景进度作为派生值，不通过专门的持久化写接口更新
- 主舞台上一篇 / 下一篇导航信息由详情接口返回

推荐的内容详情响应结构：

```json
{
  "scenario": {},
  "contentItem": {},
  "structuredContent": {}
}
```

其中：

- `scenario` 负责导航与场景上下文
- `contentItem` 负责内容元数据与原始文本
- `structuredContent` 负责段 / 句 / 词结构树

### V1 API contract

当前代码中的 TypeScript 源口径位于 `lib/types/api.ts`，各路由处理器以该文件中的请求 / 响应类型为准。

#### 场景接口

`GET /api/scenarios`

用途：

- 场景目录页

推荐响应：

```json
{
  "items": [
    {
      "id": "scn_job_interview",
      "slug": "job-interview",
      "title": "Job Interview",
      "summary": "Practice common interview answers and follow-up questions.",
      "articleCount": 12,
      "readProgress": {
        "readCount": 4,
        "totalCount": 12,
        "ratio": 0.33
      },
      "lastReadAt": "2026-03-26T10:00:00Z"
    }
  ]
}
```

`GET /api/scenarios/:slug`

用途：

- 场景上下文
- 文章目录页头部信息

推荐响应：

```json
{
  "id": "scn_job_interview",
  "slug": "job-interview",
  "title": "Job Interview",
  "summary": "Practice common interview answers and follow-up questions.",
  "category": "workplace",
  "articleCount": 12,
  "readProgress": {
    "readCount": 4,
    "totalCount": 12,
    "ratio": 0.33
  }
}
```

#### 文章目录接口

`GET /api/scenarios/:slug/content-items`

用途：

- 文章目录页

推荐响应：

```json
{
  "scenario": {
    "id": "scn_job_interview",
    "slug": "job-interview",
    "title": "Job Interview"
  },
  "items": [
    {
      "id": "ci_001",
      "title": "Tell Me About Yourself",
      "contentKind": "dialogue",
      "difficultyLevel": "B1",
      "sourceType": "preset",
      "hasRead": true,
      "farthestParagraphIndex": 2,
      "updatedAt": "2026-03-26T10:00:00Z"
    }
  ]
}
```

#### 主舞台详情接口

`GET /api/content-items/:id`

用途：

- 正式 `ContentItem` 的练习主舞台

推荐响应：

```json
{
  "subjectType": "contentItem",
  "scenario": {
    "id": "scn_job_interview",
    "slug": "job-interview",
    "title": "Job Interview"
  },
  "contentItem": {
    "id": "ci_001",
    "scenarioId": "scn_job_interview",
    "title": "Tell Me About Yourself",
    "contentKind": "dialogue",
    "difficultyLevel": "B1",
    "sourceType": "preset",
    "status": "ready"
  },
  "structuredContent": {
    "version": 1,
    "paragraphs": []
  },
  "articleProgress": {
    "farthestParagraphIndex": 2,
    "lastReadAt": "2026-03-26T10:00:00Z"
  },
  "articleReadState": {
    "hasRead": true,
    "firstReadAt": "2026-03-26T09:00:00Z",
    "lastReadAt": "2026-03-26T10:00:00Z"
  },
  "navigation": {
    "prevContentItemId": null,
    "nextContentItemId": "ci_002",
    "isFirst": true,
    "isLast": false
  }
}
```

`GET /api/generated-drafts/:id`

用途：

- `GeneratedDraft` 的练习主舞台

推荐响应：

```json
{
  "subjectType": "generatedDraft",
  "scenario": {
    "id": "scn_job_interview",
    "slug": "job-interview",
    "title": "Job Interview"
  },
  "generatedDraft": {
    "id": "gd_001",
    "scenarioId": "scn_job_interview",
    "title": "Mock Interview Draft",
    "contentKind": "dialogue",
    "difficultyLevel": "B1",
    "status": "ready",
    "insertedToStage": true,
    "savedContentItemId": null
  },
  "structuredContent": {
    "version": 1,
    "paragraphs": []
  }
}
```

#### GeneratedDraft 生命周期接口

`POST /api/generated-drafts`

用途：

- 生成新的 `GeneratedDraft`

请求示例：

```json
{
  "scenarioSlug": "job-interview",
  "prompt": "Generate a B1-level mock interview for a product manager role.",
  "contentKind": "dialogue",
  "difficultyLevel": "B1"
}
```

响应示例：

```json
{
  "generatedDraftId": "gd_001",
  "status": "ready"
}
```

规则：

- V1 先返回 `GeneratedDraft`
- 不直接返回正式 `ContentItem`
- 未保存草稿默认不进入长期管理列表

`POST /api/generated-drafts/:id/insert-to-stage`

用途：

- 将草稿插入主舞台练习

响应示例：

```json
{
  "generatedDraftId": "gd_001",
  "insertedToStage": true
}
```

`POST /api/generated-drafts/:id/save`

用途：

- 将草稿转正为正式 `ContentItem`

响应示例：

```json
{
  "generatedDraftId": "gd_001",
  "savedContentItemId": "ci_101"
}
```

`POST /api/generated-drafts/:id/discard`

用途：

- 丢弃未转正的草稿，并结束其生命周期

响应示例：

```json
{
  "generatedDraftId": "gd_001",
  "status": "discarded",
  "discarded": true
}
```

#### 进度接口

`POST /api/content-items/:id/read`

用途：

- 标记文章已阅读

请求示例：

```json
{
  "event": "body_interaction"
}
```

响应示例：

```json
{
  "contentItemId": "ci_001",
  "hasRead": true,
  "firstReadAt": "2026-03-26T10:00:00Z",
  "lastReadAt": "2026-03-26T10:00:00Z"
}
```

`POST /api/content-items/:id/progress`

用途：

- 更新文章最远 paragraph 进度

请求示例：

```json
{
  "farthestParagraphIndex": 3
}
```

响应示例：

```json
{
  "contentItemId": "ci_001",
  "farthestParagraphIndex": 3,
  "lastReadAt": "2026-03-26T10:05:00Z"
}
```

规则：

- 只接受更远的 `farthestParagraphIndex`
- 不允许被更小值回退覆盖

## 进度模型

V1 已确认采用双层进度模型：

- 文章进度
- 场景进度

### 文章进度

文章进度用于表示某一篇内容具体练到哪里。

V1 规则：

- 以 `farthestParagraphIndex` 作为主进度
- 用于恢复该篇内容的练习位置
- 不与当前瞬时播放位置混用

概念示例：

```text
ArticleProgress
- contentItemId
- farthestParagraphIndex
- lastReadAt
```

### 场景进度

场景进度用于表示某个场景下内容覆盖率。

V1 规则：

- 以“已阅读文章数 / 场景文章总数”为准
- 只要文章被阅读过，即可计入已阅读
- 无论文章是否读完，都计入场景覆盖进度

这意味着场景进度更接近覆盖率，而不是完成度。

概念上需要区分文章阅读状态：

```text
ArticleReadState
- contentItemId
- hasRead
- firstReadAt
- lastReadAt
```

场景进度更适合作为派生值，而不是强制持久化主字段。

### 已阅读文章判定

V1 需要为 `ArticleReadState.hasRead` 提供稳定、轻量的判定标准。

推荐规则：

- 用户进入某篇内容的 `PracticePage` 后
- 只要产生过一次正文交互，即可将该文章记为“已阅读”

正文交互可包括以下任一行为：

- 首次命中正文中的 paragraph / sentence / token
- 首次点击正文片段并触发播放
- 首次明确进入正文阅读区并开始练习流程

设计原则：

- `hasRead` 表示“已接触并开始阅读/练习”，而不是“已完成”
- 不要求文章读完
- 不要求播放到结尾
- 不要求达到特定 paragraph 进度阈值

这样可以保证场景进度表达的是内容覆盖率，而不是完成度。

## 生成内容生命周期

生成内容不必在生成后立即成为正式场景内容，可先以临时结果存在。

V1 期望支持的动作：

- 生成后插入主舞台练习
- 生成后直接保存到当前场景数据库
- 插入主舞台后再决定是否保存到数据库

这意味着生成结果与正式 `ContentItem` 的生命周期可以分离。

### GeneratedDraft

为避免“生成结果”“预览内容”“临时内容”等概念混用，V1 统一使用 `GeneratedDraft` 表示生成后的临时内容对象。

定义：

- `GeneratedDraft` 是已生成、可展示、可练习，但尚未确定是否保存为正式场景内容的对象
- `GeneratedDraft` 不是正式 `ContentItem`
- `GeneratedDraft` 可以被保存并转化为正式 `ContentItem`

生命周期：

```text
generate request
  -> GeneratedDraft(ready)
  -> GeneratedDraft(inserted_to_stage?)
  -> GeneratedDraft(saved -> content_item)
   \-> GeneratedDraft(discarded)
```

规则：

- V1 当前同步生成链路直接产出 `ready` 草稿；schema 中的 `created` 保留给未来异步生成或排队态
- `GeneratedDraft` 可以插入主舞台而不转正
- `GeneratedDraft` 可以直接保存到当前场景数据库
- `GeneratedDraft` 插入主舞台后仍可选择保存或 discard
- 保存到场景数据库意味着将 `GeneratedDraft` 转化为正式 `ContentItem`
- `discarded` 草稿不能再次插入主舞台或保存
- `saved` 草稿保留回指关系，但不能再 discard
- 主舞台应尽量以一致方式消费 `GeneratedDraft` 与正式 `ContentItem`

进度边界：

- `GeneratedDraft` 可拥有临时练习状态
- 正式的文章进度体系优先绑定正式 `ContentItem`
- 未保存的 `GeneratedDraft` 不应默认进入正式文章进度统计

## 前端消费模型

练习页应一次加载完整内容树，并在前端本地完成交互。

建议的本地 UI 状态：

- `hoveredNode`
- `playingNode`
- `ttsStatus`
- `generateDrawerOpen`

V1 的交互模型采用“距离驱动命中”，而不是手动切换粒度：

- 鼠标更靠近 token 时命中词
- 鼠标位于句子热区但未进入 token 热区时命中句
- 鼠标位于段落热区但未进入更细粒度热区时命中段
- 点击当前命中节点后直接播放

这样可以在保持单主命中的同时，形成“由远及近聚焦文本”的练习体验。

## Practice Page 组件树

推荐的 V1 组件结构：

```text
PracticePage
  ├─ PracticeHeader
  ├─ TextStage
  │   ├─ ContentViewport
  │   │   └─ StructuredContent
  │   │       └─ ParagraphBlock[]
  │   │           └─ SentenceRun[]
  │   │               └─ TokenSpan[]
  │   ├─ HoverEngine
  │   └─ HighlightLayer
  ├─ PlaybackBar
  └─ GenerateDrawer
```

职责划分：

- `PracticePage`
  - 拉取 `scenario + contentItem + structuredContent`
  - 持有页面级状态
  - 负责生成新内容后的页面切换
- `PracticeHeader`
  - 显示场景信息、内容信息、次级操作
- `TextStage`
  - 承载文本交互主舞台
- `ContentViewport`
  - 负责结构化文本树渲染
- `HoverEngine`
  - 负责距离驱动的命中层级判断与迟滞控制
- `HighlightLayer`
  - 负责 hover / playing 的视觉反馈
- `PlaybackBar`
  - 负责当前播放状态与基础播放控制
- `GenerateDrawer`
  - 默认收起的实时生成入口

约束：

- `HoverEngine` 只负责判断当前命中节点，不直接发起播放
- 播放由点击行为结合当前 `hoveredNode` 触发
- `ContentViewport` 专注于渲染，不承担命中决策

## PlaybackBar 职责与信息密度

`PlaybackBar` 是点击即播之后的持续反馈区，不是主交互入口，也不是复杂控制台。

核心职责：

- 显示当前 `playingNode`
- 显示当前播放文本摘要
- 提供基础播放控制
- 显示 TTS 状态反馈

推荐结构：

```text
PlaybackBar
  ├─ PlaybackTarget
  ├─ PlaybackText
  └─ PlaybackControls
```

子职责：

- `PlaybackTarget`
  - 显示当前播放层级：`token | sentence | paragraph`
  - 使用与文本区一致的层级色提示
- `PlaybackText`
  - 显示当前播放文本摘要
  - token 通常可完整显示
  - paragraph 在必要时可截断
- `PlaybackControls`
  - 提供 V1 最小控制集：重播、停止、速度
  - 表达 `idle | loading | playing | error`

信息密度原则：

- 保持单行、低噪音、持续可见
- 不承载复杂模型参数
- 不承载 prompt 输入
- 不承载翻译、词义、历史记录等次级信息

状态边界：

- `PlaybackBar` 只消费 `playingNode` 与 `ttsStatus`
- `PlaybackBar` 不消费 `hoveredNode`
- `TextStage` 负责“当前选中谁”
- `PlaybackBar` 负责“当前正在播谁”

布局原则：

- `PlaybackBar` 常驻于页面底部区域
- 作为 `TextStage` 与 `GenerateDrawer` 之间的稳定反馈层
- 延续段 / 句 / 词的层级色体系，但不抢占文本主舞台

## structured_content 结构

V1 的 `structured_content` 采用树形结构，专注表达段 / 句 / 词层级，不承载内容元信息。

推荐结构：

```json
{
  "version": 1,
  "paragraphs": [
    {
      "id": "p1",
      "index": 0,
      "speakerId": "interviewer",
      "speakerLabel": "Interviewer",
      "text": "Tell me about yourself.",
      "startOffset": 0,
      "endOffset": 24,
      "sentences": [
        {
          "id": "s1",
          "index": 0,
          "text": "Tell me about yourself.",
          "startOffset": 0,
          "endOffset": 24,
          "tokens": [
            {
              "id": "t1",
              "index": 0,
              "text": "Tell",
              "normalizedText": "tell",
              "isPunctuation": false,
              "startOffset": 0,
              "endOffset": 4
            }
          ]
        }
      ]
    }
  ]
}
```

字段规则：

- 顶层只保留 `version` 和 `paragraphs`
- `structured_content` 不重复存储 `title`、`contentKind`、`normalizedText` 等元信息
- `speakerId` / `speakerLabel` 为段落级可选字段
- 句子层不重复挂载 speaker 信息
- 词层保留 `normalizedText`
- 每层都保留 `text`
- 所有 `startOffset` / `endOffset` 都基于 `ContentItem.normalized_text`

V1 不引入以下字段：

- `lemma`
- `whitespaceAfter`
- `charLength`
- 对齐元数据
- 发音评分或语言学增强字段

## 双语翻译扩展边界

后续版本可能支持“一行英文 + 一行中文翻译”的双语练习显示方式。

V1 预留原则：

- 英文主文本树仍然保持单语结构
- `structured_content` 继续只承载英文主文本的段 / 句 / 词结构
- 翻译不直接写入 V1 的 `structured_content` 主结构

推荐未来扩展方式：

```text
ContentItem
  - raw_text
  - normalized_text
  - structured_content
  - translation_bundle?
```

推荐翻译映射粒度：

- 优先以 `sentence` 层做翻译映射

原因：

- “一行英文一行中文”最自然对应 sentence 层
- paragraph 级过粗
- token 级过细，会过早增加复杂度

推荐未来形态示例：

```json
{
  "translationBundle": {
    "language": "zh-CN",
    "sentenceTranslations": [
      {
        "sentenceId": "s1",
        "text": "请介绍一下你自己。"
      }
    ]
  }
}
```

交互边界：

- 英文行继续作为主命中对象
- 中文翻译行默认不进入 HoverEngine 的主命中体系
- 中文翻译层默认作为辅助阅读层，而不是主交互层

数据约束：

- `Sentence.id` 必须稳定，以支持未来的翻译映射
- 双语扩展不改变英文主文本的 offset 坐标系
- V1 详情接口可显式预留 `translationBundle: null`，但 `structuredContent` 继续只返回英文主文本树

## 前端运行时数据边界

前端文本交互层在 `structuredContent` 之上，再构建三层运行时视图：

```text
structuredContent
  -> RuntimeNodeIndex
  -> HoverCandidateIndex
  -> LayoutNodeIndex
```

职责区分：

- `RuntimeNodeIndex`
  - 语义索引
  - 负责通过 id 查节点、查父子关系、查顺序
- `HoverCandidateIndex`
  - 命中候选索引
  - 负责提供 paragraph / sentence / token 三层可命中对象目录
- `LayoutNodeIndex`
  - 几何与热区索引
  - 负责表达每个可命中对象在屏幕上的显示边界和命中边界

其中 `structuredContent` 仍然是服务端返回的树形结构，不因前端交互需求改变服务端响应形态。

## HoverCandidateIndex

`HoverCandidateIndex` 是供 `HoverEngine` 消费的扁平候选目录。

推荐结构：

```ts
type HoverCandidateIndex = {
  paragraphs: HoverCandidateNode[]
  sentences: HoverCandidateNode[]
  tokens: HoverCandidateNode[]
  byKey: Record<string, HoverCandidateNode>
}

type HoverCandidateNode = {
  key: string
  id: string
  level: 'paragraph' | 'sentence' | 'token'
  text: string
  startOffset: number
  endOffset: number
  index: number
  paragraphId: string
  sentenceId?: string | null
  isPunctuation?: boolean
}
```

规则：

- `key` 使用统一格式，如 `paragraph:p1`、`sentence:s1`、`token:t1`
- 三层候选对象都按文本自然顺序排列
- `HoverCandidateIndex` 不承载视觉样式状态
- 标点 token 保留在候选集中，不在数据层删除

## LayoutNodeIndex

V1 已确认采用“逐层独立采样”，而不是“仅采 token 后向上聚合”。

这意味着：

- `paragraph`、`sentence`、`token` 都是独立交互层
- 三层都拥有自己的几何采样结果
- 三层都允许拥有自己的命中热区
- 粗层级热区可以比实际文本边界更宽松

推荐结构：

```ts
type LayoutNodeIndex = {
  byKey: Record<string, LayoutNode>
  paragraphKeys: string[]
  sentenceKeys: string[]
  tokenKeys: string[]
}

type LayoutNode = {
  key: string
  id: string
  level: 'paragraph' | 'sentence' | 'token'
  contentRect: Rect
  hoverZoneRect: Rect
  paragraphId: string
  sentenceId?: string | null
  isPunctuation?: boolean
}
```

几何规则：

- `contentRect` 表示实际显示边界
- `hoverZoneRect` 表示允许命中的热区边界
- V1 命中逻辑基于矩形区域
- V1 不在设计层定义 DOM ref 等实现细节
- V1 允许跨行 sentence 先以单个外包矩形近似表示

## HoverEngine 契约

`HoverEngine` 的职责是根据当前指针位置、候选节点和几何索引，输出唯一的当前命中节点。

它不是渲染器，也不负责播放。

推荐输入：

```ts
type PointerState = {
  x: number
  y: number
  insideTextStage: boolean
}

type HoverEngineState = {
  hoveredKey: string | null
}
```

输入来源：

- `PointerState`
- `HoverCandidateIndex`
- `LayoutNodeIndex`
- 当前 `hoveredKey`

推荐输出：

```ts
type HoverEngineResult = {
  hoveredKey: string | null
  hoveredLevel?: 'paragraph' | 'sentence' | 'token' | null
  reason?: 'token-hit' | 'sentence-hit' | 'paragraph-hit' | 'hold' | 'fallback' | 'exit'
}
```

核心职责：

- 单主命中
- 按 `token > sentence > paragraph` 进行层级优先判断
- 维护迟滞与保持规则
- 在失去细粒度命中条件时逐级回退，而不是直接清空

明确边界：

- `HoverEngine` 不负责播放
- `HoverEngine` 不负责渲染
- `HoverEngine` 不负责样式
- 播放由点击行为结合当前 `hoveredNode` 触发

## HoverEngine reason 规则

`HoverEngineResult.reason` 主要用于调试、验证和行为解释，不面向终端用户。

V1 reason 枚举：

- `token-hit`
- `sentence-hit`
- `paragraph-hit`
- `hold`
- `fallback`
- `exit`

语义说明：

- `token-hit`
  - 当前结果命中 token
  - 表示进入 token 层或切换到 token 层
- `sentence-hit`
  - 当前结果命中 sentence
  - 表示进入 sentence 层或切换到 sentence 层
- `paragraph-hit`
  - 当前结果命中 paragraph
  - 表示进入 paragraph 层或切换到 paragraph 层
- `hold`
  - 当前节点保持不变
  - 表示命中系统选择稳定维持当前 hover，而不是切换
- `fallback`
  - 当前节点从更细层回退到更粗层
  - 例如 `token -> sentence`、`sentence -> paragraph`
- `exit`
  - 当前节点被清空
  - 表示指针离开所有有效热区，或离开 `TextStage`

补充字段建议：

```ts
type HoverEngineResult = {
  hoveredKey: string | null
  hoveredLevel?: 'paragraph' | 'sentence' | 'token' | null
  reason?: 'token-hit' | 'sentence-hit' | 'paragraph-hit' | 'hold' | 'fallback' | 'exit'
  fromLevel?: 'paragraph' | 'sentence' | 'token' | null
  toLevel?: 'paragraph' | 'sentence' | 'token' | null
}
```

其中：

- `reason` 表示主要行为语义
- `fromLevel` / `toLevel` 用于补充解释层级切换路径

规则原则：

- 更细粒度满足进入条件时，`hit` 优先于 `hold`
- 失去细粒度保持条件但粗层仍成立时，`fallback` 优先于 `exit`
- 只有从非空 hover 状态切到空状态时，才应输出 `exit`

状态转移规则表：

### 当前为 `null`

| 条件 | 输出 | reason |
|---|---|---|
| token 满足进入条件 | token | `token-hit` |
| sentence 满足进入条件，且 token 不成立 | sentence | `sentence-hit` |
| paragraph 满足进入条件，且更细层不成立 | paragraph | `paragraph-hit` |
| 所有层都不成立 | `null` | 无 |

### 当前为 `paragraph`

| 条件 | 输出 | reason |
|---|---|---|
| token 满足进入条件 | token | `token-hit` |
| sentence 满足进入条件，且 token 不成立 | sentence | `sentence-hit` |
| 当前 paragraph 仍满足保持条件 | paragraph | `hold` |
| paragraph 不再成立 | `null` | `exit` |

### 当前为 `sentence`

| 条件 | 输出 | reason |
|---|---|---|
| token 满足进入条件 | token | `token-hit` |
| 当前 sentence 仍满足保持条件 | sentence | `hold` |
| sentence 失效但 paragraph 仍成立 | paragraph | `fallback` |
| 全部失效 | `null` | `exit` |

### 当前为 `token`

| 条件 | 输出 | reason |
|---|---|---|
| 当前 token 仍满足保持条件 | token | `hold` |
| token 失效但 sentence 仍成立 | sentence | `fallback` |
| token 与 sentence 失效但 paragraph 仍成立 | paragraph | `fallback` |
| 全部失效 | `null` | `exit` |

## Practice Page 布局方案

已确认 V1 采用方案 A：中心单栏舞台。

页面结构：

```text
PracticePage
  Header
  TextStage
  PlaybackBar
  GenerateDrawer
```

布局原则：

- `TextStage` 是页面主舞台
- 文本区单栏居中显示
- 文本周围保留足够空白，作为层级命中的感应缓冲带
- `PlaybackBar` 常驻并承接点击播放后的反馈
- `GenerateDrawer` 位于页面底部区域，默认收起
- 不设置常驻侧栏，避免干扰文本附近的命中空间

设计原因：

- 该产品的主交互是文本片段命中与播放，而不是侧栏操作或表单输入
- 距离驱动的段 / 句 / 词命中需要文本周围存在可呼吸空间
- 将实时生成入口降为次级操作，可以防止界面退化为“带文本的 prompt 页”
- 当前场景内的内容切换应围绕主舞台展开，而不是退回到聊天式信息流

## Practice Page 交互模型

V1 已确认采用“距离驱动命中层级”。

核心原则：

- 鼠标与文本的距离决定当前命中层级
- 同一时刻只有一个 `hoveredNode`
- 点击当前命中节点后直接播放
- `playingNode` 与 `hoveredNode` 独立
- 层级切换必须具备迟滞机制，避免抖动

层级优先级：

```text
token > sentence > paragraph
```

命中热区模型：

```text
paragraph zone
  contains sentence zones
    contain token zones
```

命中规则：

- 足够靠近 token 时命中词
- 不满足 token 命中但满足 sentence 条件时命中句
- 不满足 token 和 sentence 命中但满足 paragraph 条件时命中段
- 不在任何热区内时，不命中任何节点

状态规则：

- `hoveredNode` 代表当前鼠标准备操作的节点
- `playingNode` 代表当前正在播放的节点
- 同一时刻只能存在一个 `hoveredNode`
- 若二者重合，只展示一个最强态高亮

高亮规则：

- token、sentence、paragraph 使用不同色系
- hover 使用轻高亮
- playing 使用强高亮
- 颜色用于表达层级，强度用于表达状态

Generate 入口规则：

- 实时生成入口位于 Practice Page 内
- 默认收起
- 用户主动展开后，才能输入 prompt 并生成内容
- 生成成功后，新内容仍进入同一套 Practice Page 流程

主舞台导航规则：

- 主舞台可提供当前场景内的上一篇 / 下一篇快速切换
- 该导航优先表达“当前场景内的内容切换”
- 场景切换与内容切换属于不同层级，不建议共用同一组主导航语义

边界规则：

- 左右导航只在当前场景的文章集合内生效
- 当前内容为第一篇时，“上一篇”按钮禁用
- 当前内容为最后一篇时，“下一篇”按钮禁用
- V1 不自动跨场景切换
- V1 不采用循环切换
- 可提供轻量边界提示，但不改变主导航按钮语义

## Practice Page 视觉语法

V1 视觉反馈需要同时表达两个维度：

- 层级：`paragraph | sentence | token`
- 状态：`hover | playing`

设计原则：

- 颜色表达层级
- 强度表达状态
- 同一时刻只有一个 hover 主高亮
- `playing` 高亮可独立于 `hover` 存在

推荐层级色系：

- `token`: 蓝色系
- `sentence`: 绿色系
- `paragraph`: 橙色系

推荐状态表达：

- `hover`
  - 使用轻高亮
  - 采用浅底色或较轻描边
- `playing`
  - 使用强高亮
  - 采用更深底色或更强描边

形状语法：

- `token`
  - 视觉边界紧贴词本身
  - 表现为更精确的点状或短片段高亮
- `sentence`
  - 表现为连续带状高亮
  - 强调整句是一个语义片段
- `paragraph`
  - 表现为更外层的块状包裹
  - 可覆盖段落周围少量留白

重叠规则：

- 若 `hoveredNode` 与 `playingNode` 为同一节点，只显示一个强态高亮
- 若二者为不同节点，可同时存在，但必须保持层级色相清晰、状态强弱清晰

动画原则：

- `hover` 可采用快速淡入
- `playing` 可采用极轻微的持续动效
- 不应使用强烈、分散注意力的动画

约束：

- 视觉语法不应破坏文本可读性
- 不应为不同层级叠加过多额外装饰规则
- 颜色负责表达层级，强度负责表达状态

## 延后处理的问题

以下问题明确延后：

- 用户编辑
- 富文本编辑器框架
- 发音评分
- 超出文本 offset 范围的对齐元数据
- 详细的用户进度模型
- 自定义后台系统
- 深度 TTS 缓存与复用策略
