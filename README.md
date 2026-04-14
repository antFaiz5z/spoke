# Spoke

默认文档语言为中文。English version: `README.en.md`

Spoke 是一个以文本片段为中心的英语口语练习工作台。

项目围绕「场景目录 -> 文章目录 -> 练习主舞台」构建，核心交互不是聊天线程，而是对 paragraph、sentence、token 三层文本片段进行命中、播放和进度跟踪。当前仓库已经完成 foundation 阶段的基础收口，重点包括结构化内容、hover / playback 运行时、生成草稿生命周期以及可自托管的本地开发链路。

## 项目能力

- 浏览场景化练习内容
- 打开练习单元并对段 / 句 / 词进行交互
- 通过 TTS 播放文本片段
- 记录已读状态和最远段落进度
- 生成临时练习草稿，并选择保存或丢弃
- 为未来的翻译层预留独立边界，而不污染英文主文本树

## 技术栈

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- PostgreSQL

## 目录结构

- `app/`：路由、页面和 UI 编排
- `app/practice/_stage/`：练习主舞台共享模块
- `lib/`：内容处理、运行时索引、API 契约、provider、服务端逻辑
- `db/`：PostgreSQL schema 和数据库访问层
- `scripts/`：初始化和维护脚本
- `openspec/`：产品与架构变更文档

## 环境要求

- Node.js 20+
- npm
- PostgreSQL 16+

数据库地址由 `.env` 中的 `DATABASE_URL` 决定。

## 环境变量

先复制示例环境文件：

```bash
cp .env.example .env
```

当前变量如下：

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/spoke
OPENAI_PROVIDER=openai-compatible
OPENAI_API_BASE_URL=
OPENAI_API_KEY=
TTS_PROVIDER=minimax
TTS_API_BASE_URL=
TTS_API_KEY=
```

说明：

- `OPENAI_PROVIDER` 是文本生成 provider 选择器，V1 使用 `openai-compatible`
- `TTS_PROVIDER` 是语音 provider 选择器，V1 使用 `minimax`
- 如果你只浏览本地已导入内容，仍然需要 PostgreSQL；生成和 TTS 功能则需要对应 provider 凭证

## 数据库初始化

初始化 schema：

```bash
npm run db:init
```

导入场景种子：

```bash
npm run db:seed:scenarios
```

导入示例内容：

```bash
npm run import:preset -- ./scripts/examples/preset-content.sample.json --apply
```

如果需要快速起一个本地 PostgreSQL 容器：

```bash
docker run -d \
  --name spoke-postgres \
  -e POSTGRES_DB=spoke \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

## 本地运行

启动开发服务器：

```bash
npm run dev
```

如果需要清空 Next.js 缓存后再启动：

```bash
npm run dev:clean
```

默认地址：

```text
http://localhost:3000
```

## 常用命令

```bash
npm test
npm run typecheck
npm run build
npm run verify
```

内容维护相关：

```bash
npm run rebuild:structured-content -- --dry-run
npm run rebuild:structured-content -- --apply --target all
```

## 当前基础范围

当前已经完成：

- 以 `structured_content` JSON 表示的英文结构化内容树
- hover 运行时索引和距离驱动命中逻辑
- `TextStage`、`HoverEngine`、`HighlightLayer`、`PlaybackBar` 的舞台边界
- `GeneratedDraft` 生命周期：创建、查看、插入舞台、保存、丢弃
- 文本生成和 TTS 的 provider 边界
- 通过 `translationBundle` 预留翻译层扩展位，同时保持英文主文本树不耦合

当前尚未成为完整用户功能的部分：

- 真实中文翻译内容的来源、存储和渲染
- 认证和用户体系
- 发音评分
- 长期草稿管理 UI

## 相关文档

- 英文版说明：`README.en.md`
- Foundation 提案：`openspec/changes/define-spoke-foundation/proposal.md`
- Foundation 设计：`openspec/changes/define-spoke-foundation/design.md`
- 数据库说明：`db/README.md`
- 脚本说明：`scripts/README.md`
