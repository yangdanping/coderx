# CoderX

CoderX 是一个面向开发者的图文内容社区前端，支持文章阅读与创作、Flow 动态、搜索、评论互动、个人空间、实时通知和 AI 助手。

- 在线体验：[CoderX](https://coderx.my)
- 后端仓库：[yangdanping/coderx_server](https://github.com/yangdanping/coderx_server)
- 文档入口：[当前指南与历史资料](./docs/README.md)
- Flow 完成情况、限制与验收安排：[Flow 阶段说明](./FLOW_RELEASE.md)

## 主要功能

- 文章列表、详情、搜索、收藏、评论与点赞
- 基于 Tiptap 的富文本写作、草稿保存和图片/视频上传
- Flow 图文动态、草稿恢复、媒体画廊与详情页
- 用户登录、Google/GitHub OAuth、个人资料、关注与浏览历史
- Socket.IO 在线状态和站内通知
- 流式 AI 助手，支持离线重查、失败保留输入和停止后编辑重试

## 技术栈

Vue 3、TypeScript、Vite、Vue Router、Pinia、TanStack Query、Element Plus、Tiptap、Socket.IO Client 和 Vitest。

## 本地启动

### 环境要求

- Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`，与 `package.json` 一致
- pnpm **12.11.2**，与 `packageManager` 一致；运行 `pnpm --version` 核对
- 已准备好数据库和 JWT 密钥的 CoderX Server；本示例使用 API `8000`、Socket.IO `8001`

使用 nvm 时先运行 `nvm install` 和 `nvm use`，按 [.nvmrc](./.nvmrc) 使用 Node.js 22.22.2。后端依赖 PostgreSQL；其 `migrations/` 是增量迁移，不能直接当作全新数据库的完整初始化脚本。后端的配置、基础 Schema 和密钥准备见[后端说明](https://github.com/yangdanping/coderx_server#readme)。

### 1. 安装并配置前端

```bash
git clone https://github.com/yangdanping/coderx.git
cd coderx
pnpm install --frozen-lockfile
test -e .env.development.local || cp .env.example .env.development.local
```

编辑 `.env.development.local`，核对 API 和 Socket 地址。复制命令只在目标不存在时创建文件；已有配置时直接检查内容即可。该文件已被 Git 忽略。

使用 `.env.development.local`，可以覆盖本机已有的 `.env.development` 和通用 `.env.local`，也不会把开发地址带入默认的生产构建。命令行已设置的同名环境变量优先级更高。修改配置后需要重启 Vite，加载规则见 [Vite 环境变量说明](https://vite.dev/guide/env-and-mode#env-files)。

### 2. 分别启动三个进程

在已经准备好的后端仓库根目录，打开两个终端：

```bash
# 后端终端 1：Koa API
pnpm dev

# 后端终端 2：Socket.IO
pnpm dev:socket
```

回到前端仓库，打开第三个终端：

```bash
pnpm dev
```

按示例配置访问 **http://127.0.0.1:5173**，实际地址以 Vite 的启动输出为准。开发请求走 `/dev-api`，Vite 去掉此前缀后转发到 `VITE_DEV_API_TARGET`；Socket.IO 由浏览器直接连接独立的 `8001` 端口。

也可以在前端使用 `just dev`，后端使用 `just dev` 和 `just socket`；它们分别调用上述命令。已有服务正常运行时沿用现有进程。端口占用先检查对应终端；Vite 可能自动改用下一个端口。

### 3. 确认连接正常

```bash
# 前端页面
curl -f http://127.0.0.1:5173/

# 经前端代理读取公开 Flow 列表；JSON 中 code 应为 0，空列表也正常
curl -f 'http://127.0.0.1:5173/dev-api/flow?pageNum=1&pageSize=1'

# 独立 Socket.IO 进程，应返回 {"status":"ok","service":"socket-server"}
curl -f http://127.0.0.1:8001/health
```

如果修改了端口或地址，请同步替换命令中的值。这些检查只确认服务和读取链路，登录、文章上传、草稿及发布需要另做业务验收。

## 环境变量

完整开发模板见 [.env.example](./.env.example)。下表是**模板示例值**，不是每项配置在代码中的缺省值。`VITE_` 变量会进入浏览器代码，不能存放数据库密码、JWT 私钥或模型服务密钥。

| 变量                  | 模板值                  | 说明                                                                         |
| --------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `HOST`                | `127.0.0.1`             | Vite 开发服务器监听地址                                                      |
| `PORT`                | `5173`                  | Vite 开发服务器端口                                                          |
| `VITE_BASE_URL`       | 留空                    | 开发时回退到 `/dev-api`，生产构建时回退到 `/api`                             |
| `VITE_DEV_API_TARGET` | `http://127.0.0.1:8000` | 仅供 Vite 开发代理使用；代码未配置时回退到 `http://localhost:8000`           |
| `VITE_SOCKET_URL`     | `http://127.0.0.1:8001` | 浏览器直连的 Socket.IO 地址；留空会跳过默认在线状态和实时通知连接            |
| `VITE_NEWS_URL`       | 留空                    | 可选新闻服务基础地址，不影响文章、Flow 与 AI API 的代理目标                  |
| `VITE_IS_DEV_MODE`    | `true`                  | 仅精确值 `true` 让顶栏 Flow 指向 `/flow`，其他值指向 `/dev`；不控制 API 权限 |

**跨设备访问：** 将 `HOST` 改为 `0.0.0.0`，用开发电脑的局域网 IP 打开页面；`VITE_SOCKET_URL` 要填浏览器能访问的电脑 IP，不能继续使用 `127.0.0.1`。API 在开发电脑上代理，`VITE_DEV_API_TARGET` 仍可用回环地址。后端 `FRONTEND_URL` 应与浏览器访问的前端源（协议、主机、端口）一致，以匹配 Socket CORS 和 OAuth 回跳。

**生产构建：** 在部署平台或被忽略的 `.env.production.local` 中设置生产值。`VITE_BASE_URL` 留空时为 `/api`，需要托管层将它转发到 API；使用绝对 API 地址时，后端需允许前端源。配置生产 Socket.IO 地址，并按发布安排设置 Flow 导航开关。不要将开发模板直接复制成生产配置。变量在构建时确定，修改后需要重新构建、发布。

## AI 服务（可选）

AI 通过 Koa API 调用 Ollama；前端不直接连接模型端口。后端的 `.env.development` 使用分开的 `OLLAMA_HOST`（如 `http://127.0.0.1`，不带端口和 `/v1`）与 `OLLAMA_PORT=11434`。模型需已在 Ollama 安装，并符合后端 `AI_ALLOWED_MODELS` 配置。

```bash
curl -f http://127.0.0.1:8000/ai/health
```

响应应包含 `status: "online"` 和非空模型列表。使用 Windows 远程 Ollama 时，将后端主机改为该设备可达的地址；通过 Tailscale 连接时，先核对两端在线，再检查模型端口。Ollama 不可用不妨碍文章与 Flow 服务启动；AI 面板会显示离线，可保留输入并点击“重新检查”。请求失败或回答中断后可编辑重试；点击“停止”保留输入和已生成内容。

## 常用命令

| 命令                   | 用途                                              |
| ---------------------- | ------------------------------------------------- |
| `pnpm dev`             | 启动开发服务器                                    |
| `pnpm type-check`      | 检查 Vue/TypeScript 类型                          |
| `pnpm lint`            | 运行 ESLint                                       |
| `pnpm exec vitest run` | 运行测试                                          |
| `pnpm build`           | 类型检查并构建到 `dist/`                          |
| `pnpm preview`         | 本地预览生产构建，不能替代生产托管与 API 路由配置 |

提交前运行：

```bash
pnpm lint
pnpm exec vitest run
pnpm build
```

`pnpm build` 已包含 `vue-tsc --noEmit`；只检查类型时可单独运行 `pnpm type-check`。

## 项目结构

```text
coderx/
├── public/              # 不经构建处理的静态资源
├── src/
│   ├── assets/          # 样式、字体和图片资源
│   ├── components/      # 跨页面复用组件与编辑器
│   ├── composables/     # 可复用的组合式业务逻辑
│   ├── global/          # 应用初始化和统一请求封装
│   ├── router/          # 页面路由
│   ├── service/         # 后端 API 与实时通信客户端
│   ├── stores/          # Pinia 客户端状态
│   ├── types/           # TypeScript 类型定义
│   ├── utils/           # 通用工具
│   └── views/           # 路由级页面
├── test/                # 测试初始化与辅助代码；业务测试也与 src 源码相邻
├── .env.example         # 可提交的开发配置模板
├── FLOW_RELEASE.md      # Flow 阶段状态与验收边界
├── vite.config.ts       # 构建、代理和插件配置
└── vitest.config.ts     # 测试配置
```

页面通常通过 `composables` 或 `stores` 组织状态，再由 `service` 调用统一请求封装。AI 流式传输使用 AI SDK 的 transport，健康检查封装在独立 composable 中。

## 常见问题

### 仍在使用旧地址或启动端口不同

检查 `.env.development.local` 和终端同名环境变量；不要只修改优先级较低的 `.env.local`。重启 Vite 后，以启动输出为准；端口被占用时先确认是否已经启动了同一项目。

### API 请求返回 404 或连接失败

确认 API 进程运行，核对 `VITE_DEV_API_TARGET` 和 `VITE_BASE_URL`。本地开发使用留空的 `VITE_BASE_URL` 或 `/dev-api`；本仓库现有 `/api` 开发代理指向远程服务器，不能把它当成本地代理。生产环境则检查托管层的 `/api` 路由或绝对 API 地址。

### 在线状态、通知或 OAuth 回跳不可用

确认 `pnpm dev:socket` 已启动，核对浏览器可达的 `VITE_SOCKET_URL` 和后端 `FRONTEND_URL`，尤其注意 `localhost`、`127.0.0.1`、局域网 IP 和端口是否一致。

### Flow 顶栏仍进入“开发中”

将 `VITE_IS_DEV_MODE` 设置为精确字符串 `true`，开发环境重启、生产环境重新构建。该开关只影响导航，`/flow` 路由始终存在；功能边界见 [Flow 阶段说明](./FLOW_RELEASE.md)。

### AI 显示离线或请求中断

先检查 API 的 `/ai/health`，再检查后端到 Ollama 的网络、模型和白名单；通过 Tailscale 使用 Windows 模型服务时，检查两端设备是否在线。恢复后在面板点击“重新检查”，或编辑保留的问题重试。
