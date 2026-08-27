# Flow 图片上传设计

## 目标与范围

为 Flow 发布弹窗增加图片附件能力，并接通真实发布链路。用户可以选择、粘贴或拖入图片，立即看到本地预览和逐项上传状态；发布时由服务端在一个事务中创建 Flow 并绑定仍在附件列表里的媒体。

本期只支持图片，不支持视频、图片内联到正文、已发布 Flow 编辑或跨设备草稿同步。关闭弹窗仍保留当前页面生命周期内的正文和附件；`Esc`、关闭图标和绳子只关闭弹窗，不丢弃草稿。

## 现状结论

### 前端

- `TiptapEditorFlow` 复用评论编辑器配置，明确不含媒体扩展，目前只输出 HTML。
- Flow 展示模型已经是 `body + media[]`，`FlowMediaGallery` 已支持多图和灯箱，但 Feed 缩略图错误地加载原图。
- 文章编辑器已有上传、稳定 `imageId` 和 pending 清理能力，但 `ImageUpload` 强耦合全局 `editor.store`，不能直接放进 Flow，否则文章和 Flow 会互相污染待清理图片。
- Flow 服务目前全是本地 mock，发布按钮固定禁用。

### 服务端与数据库

- 服务端当前继续使用 Koa 3 + CommonJS + PostgreSQL，也没有 Flow 路由、服务或表。本任务不包含后端框架迁移。
- `file` 只通过 `article_id` / `draft_id` 表达业务归属；`media_object` 管理本地/R2 物理副本；未关联文件由每日任务在 7 天后清理。
- `/img` 只校验客户端 MIME 前缀，允许 SVG 等主动内容；批量上传只有第一张会解码并生成缩略图。
- 图片绑定与删除没有完整的用户归属校验，不能作为 Flow 新接口的安全基线。
- R2 对象键硬编码 `articles/{articleId}/...`，未绑定文章的 Flow 图片无法晋升并会被孤儿清理。

## 方案比较

### A. 图片作为 Tiptap 内联节点

优点是可以复用文章的 `ImageNode` 和插入位置逻辑。缺点是与现有 `FlowItem.media[]`、Gallery 和纯文本 Feed 合同冲突，还会把短动态编辑器带入文章级媒体复杂度。

不采用。

### B. 富文本正文 + 独立有序附件

正文继续由 Tiptap 管理，图片在编辑器下方成为 0–9 个独立附件。附件有自己的上传、失败、重试、删除和排序状态；服务端使用 `flow_post_media` 保存顺序。

这是推荐方案：它匹配当前展示模型，边界清晰，也能让 Feed 使用缩略图、灯箱使用原图。

### C. 浏览器直传 R2（本期不采用）

可降低应用服务器带宽，但需要签名上传、回调确认、对象校验和更复杂的未完成 multipart 回收。本项目已经有本地写入和发布时晋升流程，本期引入直传收益不足。

作为后续容量升级方案，不进入本期。这不代表 Flow 图片不使用 R2；本期沿用已经上线的“未发布文件留本地，发布后晋升 R2”链路。

## 当前上传与 R2 边界

```text
浏览器选择图片
  → Koa 鉴权、限流和 Sharp 安全处理
  → 本地 pending 原图/small + PostgreSQL 所有权
  → POST /flow 事务绑定有序附件
  → 事务提交后幂等晋升 R2
  → media_object ready
  → media.ydp321.asia CDN URL
```

因此，R2 是正式 Flow 图片的持久化和读取主链路；本地存储只负责发布前暂存，以及当前观察期内的失败回退。第一版不增加 Bucket、不配置浏览器预签名直传，也不改变生产已有的 `r2_on_publish/r2_preferred/keep-local=true` 边界。

## 产品约束

- 每条 Flow 最多 9 张图片。
- 单张原始文件最大 10MB；一次选择的总大小最大 30MB。
- 仅接受 JPEG、PNG、WebP；拒绝 SVG、GIF、HEIC/HEIF 和仅伪造 MIME 的文件。
- 服务端真实解码，限制 4000 万像素，自动处理 EXIF 方向并移除元数据。
- 服务端生成最长边不超过 2560px 的 WebP 主图和宽度不超过 640px 的 WebP 缩略图。
- 正文最多 2000 个规范化纯文本字符；允许正文为空但至少有一张成功上传的图片。
- 上传并发数为 3；保留用户选择顺序，失败项占位且可以重试或删除。
- 任何图片处于上传中或失败态时禁止发布；只有全部附件为 `uploaded` 才可提交。
- 服务端不信任客户端 URL、顺序之外的媒体属性或文件类型声明。

## 交互设计

### 添加图片

在 Flow 工具栏的链接操作后增加低强调度图片按钮。按钮打开 `multiple` 文件选择器；粘贴和拖放图片也进入同一附件队列，图片始终作为独立附件，不插入光标位置。

选择后立即显示本地 object URL 预览，再以最多 3 个并发任务上传。超过数量或总大小时保留可接收的前几项，并一次性告知未加入的数量和原因。

### 附件区

附件区位于正文下方、发布按钮上方，使用与 Feed Gallery 接近的网格预览：

- `queued/uploading`：缩略图上覆盖轻量进度与“上传中”。
- `uploaded`：显示正常预览和删除按钮。
- `failed`：保留预览，显示简短错误、重试和删除。
- 排序通过拖动手柄完成，同时提供“前移/后移”按钮，不能只依赖拖拽。
- 点击已上传图片打开现有灯箱；Feed 卡片加载 `thumbnailUrl`，灯箱加载 `url`。

### 发布与关闭

发布按钮的状态由“正文或图片非空、所有附件上传成功、当前未提交”共同决定。提交期间显示 loading 并阻止重复点击。成功后清空草稿、关闭弹窗、恢复绳子焦点，并使 Flow Feed 第一页失效后重新获取。

发布失败保留正文和附件，不清 pending 资产。`Esc`、关闭图标或绳子关闭只隐藏弹窗；重新打开继续编辑。页面刷新或异常退出无法可靠发送删除请求，因此最终孤儿回收必须由服务端 TTL 任务保证。

## 前端状态与边界

新增实例级 `useFlowImageUploads`，不复用文章的全局 `editor.store`：

```ts
type FlowUploadStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

interface FlowImageAttachment {
  clientId: string;
  file: File;
  previewUrl: string;
  status: FlowUploadStatus;
  progress: number;
  mediaId: number | null;
  url: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  error: string | null;
}
```

- `FlowEditorModal` 只编排正文、附件和发布状态。
- `TiptapEditorFlow` 继续只负责富文本，并新增结构化 JSON 输出；Flow 图片不注册 `ImageNode`。
- `FlowAttachmentPicker` 负责 file input、drop、paste 和前端校验。
- `FlowAttachmentGrid` 负责状态展示、重试、删除、排序和灯箱。
- `useFlowImageUploads` 负责队列、并发、取消、object URL 回收与最终 `mediaIds`。
- `service/flow` 提供严格类型的上传、删除、创建与查询函数。

## API 合同

### 上传待发布图片

`POST /media/images`，multipart 字段名 `image`，每次一个文件。

```json
{
  "code": 0,
  "data": {
    "id": 123,
    "url": "https://api.ydp321.asia/article/images/uuid.webp",
    "thumbnailUrl": "https://api.ydp321.asia/article/images/uuid.webp?type=small",
    "mimeType": "image/webp",
    "sizeBytes": 456789,
    "width": 1920,
    "height": 1280
  }
}
```

### 删除未发布图片

`DELETE /media/images/:mediaId`。仅允许当前用户删除仍未关联 article、draft 或 flow 的图片；使用 R2 删除状态和本地删除 outbox，重复请求幂等成功。

### 创建 Flow

`POST /flow`：

```json
{
  "clientRequestId": "4f95672f-4f8e-4cc1-9953-7ba4c2d5f4cf",
  "content": { "type": "doc", "content": [] },
  "mediaIds": [123, 124]
}
```

服务端从 `content` 派生 `bodyText/bodyHtml`，不接受客户端提交 HTML。`clientRequestId` 在同一用户内唯一，使网络重试和双击不会创建重复 Flow。

创建事务必须：

1. 锁定全部媒体行。
2. 验证数量、去重、类型、当前用户归属、未关联 article/draft/flow。
3. 创建或命中幂等 Flow。
4. 按数组位置写入 `flow_post_media`。
5. 提交后异步/幂等晋升主图与缩略图到 R2。

### 查询 Flow

`GET /flow?pageNum=1&pageSize=10` 与 `GET /flow/:flowId` 返回现有 `FlowItem` 形状，并增加服务端派生的 `bodyHtml`。媒体 URL 统一通过 `mediaRuntime` 解析；`thumbnailUrl` 解析 small variant，`url` 解析 original variant。

## PostgreSQL 模型

新增 `flow_post` 和 `flow_post_media`，保留现有 `file` 作为逻辑媒体资产：

```sql
CREATE TABLE flow_post (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    client_request_id UUID NOT NULL,
    content JSONB NOT NULL CHECK (jsonb_typeof(content) = 'object'),
    body_text TEXT NOT NULL CHECK (char_length(body_text) <= 2000),
    create_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    update_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (user_id, client_request_id)
);

CREATE TABLE flow_post_media (
    flow_id BIGINT NOT NULL REFERENCES flow_post(id) ON DELETE CASCADE,
    file_id BIGINT NOT NULL REFERENCES file(id) ON DELETE RESTRICT,
    position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 8),
    alt_text TEXT NOT NULL DEFAULT '' CHECK (char_length(alt_text) <= 200),
    PRIMARY KEY (flow_id, file_id),
    UNIQUE (flow_id, position),
    UNIQUE (file_id)
);
```

增加 `(create_at DESC, id DESC)` 和 `(user_id, create_at DESC, id DESC)` 索引。孤儿查询必须排除存在 `flow_post_media` 的文件。PostgreSQL 无法用普通 CHECK 跨表保证文件不同时属于 article/draft/Flow，因此创建 Flow 时的事务锁与归属查询是硬约束，相关集成测试必须覆盖并发绑定。

### 迁移前数据审计

只读检查确认 PostgreSQL 18.3 中现有 113 个 `file` 全部正常关联文章，没有数据库层孤儿或双重归属；57 篇文章最多 8 张图片，因此 Flow 的 9 图上限不会与当前使用习惯冲突。不过上线前必须先处理或登记以下存量问题：

- `media_object` 目前为 0 行，存量 113 个逻辑文件尚未进入 local/R2 catalog。
- 磁盘存在 18 个无数据库行的图片和 5 个无数据库行的视频/海报，当前 orphan SQL 无法发现它们。
- 7 张图片缺少可选 small 变体，Feed 必须保留 `thumbnailUrl || url` 回退。
- 两篇文章仍引用已不存在的视频 ID；这不阻塞 Flow，但说明媒体一致性巡检需要继续保留。

## 存储策略

待发布 Flow 图片继续写入现有本地图片目录；只有在 `POST /flow` 成功绑定后，主图和缩略图才通过现有媒体状态机晋升 R2。晋升失败不回滚 Flow，继续返回本地地址并保留失败状态供幂等重试。

新 Flow 图片使用资源中立对象键：

```text
media/images/{fileId}/{sha256-prefix}-original.webp
media/images/{fileId}/{sha256-prefix}-small.webp
```

已有 `articles/{articleId}/...` 键继续可读，不做破坏性迁移。把底层 `mediaPromotion` 的键生成策略改为可注入/可选 scope；新媒体走中立键，旧文章发布保持原行为。

## 安全与失败处理

- 路由必须经过 JWT；服务层所有媒体查询都带 `user_id`，不能只依赖控制器。
- 使用 allowlist + magic number + Sharp 解码三层验证，拒绝 SVG 和无法解码内容。
- 随机文件名使用加密随机值，不使用 `Date.now()` 与用户扩展名。
- 写文件或 DB 任一步失败，删除本次已生成文件；正式删除通过本地 outbox 和 R2 状态机幂等执行。
- 创建 Flow 后媒体晋升失败不回滚已发布内容；继续保留本地可读副本，并由现有媒体任务重试。
- 上传错误使用 4xx/5xx HTTP 状态和稳定业务错误码；前端只展示可操作文案。

## 测试与验收

- 前端：类型/大小/数量边界、顺序、三并发、部分失败、重试、取消、删除、object URL 回收、关闭重开、发布门禁、重复提交和 Feed 刷新。
- 服务端：伪 MIME、SVG、像素炸弹、随机文件名、失败补偿、owner 校验、未关联删除、Flow 幂等创建、媒体原子绑定、并发抢占和孤儿查询。
- PostgreSQL 集成：外键/唯一约束、同一文件只绑定一次、两请求并发绑定只有一个成功。
- 展示：Feed 使用 small，灯箱使用 original；正文 HTML 经过 DOMPurify；桌面/窄屏、键盘和 reduced-motion 可用。

## 分阶段上线

1. 先落数据库、通用图片安全上传和归属校验，保持现有文章接口兼容。
2. 再落 Flow 创建/查询事务与资源中立 R2 晋升。
3. 最后接前端附件队列和发布 UI，并切换 mock Feed 到 API。
4. 观察上传失败、孤儿数量、R2 晋升失败和图片体积后，再评估直传 R2 与跨设备草稿。
