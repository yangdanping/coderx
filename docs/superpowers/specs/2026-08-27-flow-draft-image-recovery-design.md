# Flow 草稿图片刷新恢复设计

## 背景

Flow 编辑器已经把已上传图片的有序 ID 写入草稿 `meta.imageIds`，但整页刷新时只恢复正文。Tiptap 随后发出的恢复事件使用仍为空的媒体 ID 列表再次保存草稿，导致后端清空图片的 `draft_id`。附件队列本身也只能从本地 `File` 创建，无法从服务端图片资产恢复。

本设计修复该恢复链路。用户已确认：整页刷新后只恢复已经上传成功的图片；排队中、上传中和上传失败的本地文件不跨刷新恢复。

## 目标

- 已登录用户刷新 `/flow` 后，恢复草稿正文、已上传图片及其顺序。
- 恢复后的图片继续支持预览、排序、删除和发布。
- 恢复期间的编辑器事件不得用空或残缺的 `imageIds` 覆盖草稿。
- 本地草稿比远端更新时，使用本地缓存的已上传图片资产恢复 UI。
- 图片资产无法完整恢复时保留已有 ID，不静默保存空列表。
- 仅在解释恢复竞态、远端预览 URL 生命周期等关键位置添加简短代码注释。

## 非目标

- 不恢复刷新前仍在排队、上传中或失败的本地 `File`。
- 不把图片插入 Tiptap 正文；图片仍是独立附件队列。
- 不直接修复或重新绑定本次排查产生的数据库记录 `559`、`560`。
- 不引入通用媒体批量查询接口，也不重构文章编辑器的媒体模型。

## 方案选择

采用方案 A：Flow 草稿接口直接返回完整、有序的图片资产。

与额外的媒体批量查询接口相比，这让正文、媒体 ID 和媒体描述符来自同一个有所有权校验的草稿响应，减少一次请求和前端竞态。前端不会根据 ID 猜测 URL。

## 接口与数据模型

### 服务端草稿响应

`GET /flow/draft` 和 `PUT /flow/draft` 返回的 `FlowDraftRecord` 新增：

```ts
images: FlowImageAsset[]
```

每项沿用上传接口的数据形态：

```ts
interface FlowImageAsset {
  id: number;
  url: string;
  thumbnailUrl: string;
  mimeType: 'image/webp';
  sizeBytes: number;
  width: number;
  height: number;
}
```

服务端以 `meta.imageIds` 为顺序来源，查询属于当前用户且仍绑定当前草稿的图片文件。结果数量或顺序映射不完整时，返回冲突错误，不返回残缺的成功响应。

### 本地草稿兜底

本地草稿缓存升级为 schema version 2，并保存 `images` 描述符。读取 version 1 时仍恢复正文和媒体 ID；能够从同次远端响应匹配到的图片资产继续复用，无法匹配的 ID 保留但不写回为空。

`SaveFlowDraftPayload` 仍只向后端发送 `content`、`meta` 和 `version`。本地 `images` 只用于刷新恢复 UI，不成为后端绑定关系的第二来源。

### 前端附件模型

`FlowImageAttachment.file` 调整为 `File | null`：

- 新选择的 queued/uploading/failed 附件始终持有 `File`。
- 已恢复的 uploaded 附件没有本地 `File`，直接使用服务端 `thumbnailUrl` 和 `url`。
- 只有从 `URL.createObjectURL()` 创建的本地预览才调用 `URL.revokeObjectURL()`；远端 URL 不撤销。

`useFlowImageUploads` 新增幂等的恢复入口：

```ts
restoreUploadedAssets(assets: readonly FlowImageAsset[]): void
```

它按传入顺序建立 uploaded 附件，保留现有本地队列中同 ID 的附件，并且不触发上传请求。

## 组件职责

- `Flow.vue`：持有草稿正文、媒体 ID、图片资产和恢复锁；决定何时允许子组件事件写回草稿。
- `FlowEditorModal.vue`：把恢复资产交给上传队列；继续从队列读取发布所需的有序 ID。
- `useFlowImageUploads.ts`：统一管理新上传附件和恢复附件的状态、顺序、删除与预览生命周期。
- `useFlowDraftAutosave.ts`：选择本地或远端草稿，保存本地图片描述符，并返回可恢复状态。
- 服务端 `draft.service.js`：在当前草稿所有权范围内解析 `meta.imageIds`，生成有序图片资产。

## 恢复数据流

1. `Flow.vue` 以 `composerRestoring = true` 挂载，现有编辑器交互仍可按当前规则展示，但草稿写回事件被暂时忽略。
2. `useFlowDraftAutosave.initialize()` 同时读取本地缓存和远端 Flow 草稿，按现有时间规则选择正文与 `meta`，并返回与所选媒体 ID 对应的图片资产。
3. `Flow.vue` 先设置图片资产和 `flowDraftMediaIds`，再设置结构化正文。
4. `FlowEditorModal.vue` 将图片资产注入上传队列；队列形成 uploaded 附件并保持原顺序。
5. 等待一个 Vue 更新周期，确认子组件已接收恢复状态后解除 `composerRestoring`。
6. Tiptap 恢复正文时发出的 `update:json` 即使到达，也不会在恢复锁期间触发新的草稿保存。
7. 解除恢复锁后的用户编辑、排序、删除和新增图片继续走现有自动保存链路。

恢复锁只保护初始化边界，不改变正常关闭弹窗后保留同一附件队列的行为。

## 错误处理

- 服务端发现 `meta.imageIds` 中存在不属于当前草稿、已发布或已缺失的文件时，以冲突响应结束，避免把残缺列表当作成功结果。
- 远端读取失败但本地 version 2 缓存完整时，恢复本地正文、ID 和图片描述符，并保持现有“本地草稿仍在”状态提示。
- 本地旧缓存缺少部分图片描述符时，保留原始 `imageIds`，不初始化残缺附件队列，也不自动写回草稿；页面展示恢复错误并禁用发布，防止用户误发布缺图内容。
- 删除恢复图片继续调用现有所有权保护的 `DELETE /media/images/:id`。成功后才从队列和草稿 ID 中移除。

## 测试设计

### 服务端

- Flow 草稿读取按 `meta.imageIds` 顺序返回完整图片资产。
- 草稿保存响应同样包含图片资产。
- 跨用户、未绑定、已发布或缺失图片不能形成残缺的成功响应。
- 无图片草稿返回空 `images`。

### 前端上传队列

- `restoreUploadedAssets` 不上传文件，并按输入顺序建立 uploaded 附件。
- 恢复附件可以排序、删除，并出现在 `uploadedMediaIds` 中。
- dispose 或删除恢复附件时不撤销远端 URL。

### 页面编排

- 带正文和两张图片的远端草稿初始化后，附件队列按顺序显示两张图片。
- Tiptap 在正文恢复时发出 `update:json`，页面不会记录 `imageIds: []`。
- 初始化完成后的编辑仍会保存正确的有序图片 ID。
- 图片资产恢复不完整时保留 ID、显示错误并禁用发布。

### 回归验证

- 运行 Flow 前端聚焦测试与类型检查。
- 运行服务端草稿/Flow 媒体单元测试和 PostgreSQL 集成测试。
- 执行生产构建，确认类型和打包均通过。

## 验收标准

1. 上传两张图片并等待草稿显示“已保存”。
2. 整页刷新后打开 Flow 编辑器，两张图片和正文均存在且顺序不变。
3. 数据库草稿 `meta.imageIds` 与两个文件的 `draft_id` 在刷新后保持不变。
4. 恢复后调整顺序并发布，`flow_post_media.position` 与 UI 顺序一致。
5. 刷新前仍未成功上传的本地文件不会恢复，也不会被误表示为上传成功。
