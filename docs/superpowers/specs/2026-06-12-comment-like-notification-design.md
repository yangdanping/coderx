# 评论点赞通知设计

## 背景与根因

评论点赞接口当前调用通用 `userService.toggleLike('comment', ...)`，只切换
`comment_like` 关系并返回点赞状态。它没有查询评论作者，也没有调用现有
`notificationService`，因此不会写入 `notifications`，后续 Socket 实时推送、
REST 通知列表和未读数自然都无法收到该事件。

2026-06-12 的本地请求与数据库记录已验证这一点：用户 8 点赞评论 129 时，
`comment_like` 成功插入，但没有对应的 `notifications` 记录。

## 目标

- 他人点赞一级评论或回复时，向该评论作者创建一条站内通知。
- 通知继续复用现有 `notifications` 表、`notificationService`、通知事件总线、
  Socket.IO 房间推送、REST 查询、Pinia Store 和通知面板。
- 自己点赞自己的评论不通知。
- 取消点赞不通知。
- 同一用户反复取消再点赞同一条评论时，沿用文章点赞的一小时冷却规则。
- 点击通知后定位到被点赞的一级评论或具体回复。
- 保持现有评论点赞接口响应 `{ liked, likes }` 不变。

## 方案选择

### 推荐：专用评论点赞生产者，复用共享通知管线

新增与 `articleLike.service.js` 对称的评论点赞服务。该服务只负责评论点赞事务、
接收者解析和调用 `notificationService.createCommentLikeNotification`。通知持久化、
冷却、实时发布、REST 兜底和前端接收继续使用现有实现。

优点是职责清晰，评论点赞与通知在同一事务内提交，同时不会把评论业务和通知依赖
塞进通用 `userService.toggleLike`。

### 备选：扩展通用 `userService.toggleLike`

可以根据 `tableName === 'comment'` 分支创建通知，但会让通用点赞方法依赖评论结构、
通知服务和事件总线，且文章点赞已经使用专用服务，项目模式会变得不一致。

### 备选：数据库触发器

可在 `comment_like` 插入时创建通知，但触发器难以复用现有冷却锁、展示快照和
Socket 发布流程，也会把业务规则隐藏在数据库中。本次不采用。

## 后端设计

### 数据模型

新增通知类型 `comment_like`，目标类型为 `comment`：

- `recipient_id`: 被点赞评论的作者。
- `actor_id`: 点赞用户。
- `type`: `comment_like`。
- `target_type`: `comment`。
- `target_id`: 实际被点赞的评论或回复 ID。
- `article_id`: 评论所属文章 ID，用于详情页路由。
- `comment_id`: 实际被点赞的评论或回复 ID，用于展示与外键关联。
- `metadata.commentExcerpt`: 去除 HTML 后最多 60 个字符的评论摘要。
- `metadata.parentCommentId`: 仅点赞回复时写入其一级评论 ID。

新增迁移 `006_expand_notifications_for_comment_like.sql`。迁移更新类型约束、目标类型
约束和目标一致性约束，并保留现有 `article_like`、`article_comment`、
`comment_reply`、`follow` 行为。

### 点赞事务

新增 `commentLike.service.js`：

1. 开启事务。
2. 删除当前用户与评论的点赞关系。
3. 如果删除成功，提交并返回取消点赞，不创建通知。
4. 查询评论的作者、所属文章、父评论和内容；不存在时抛出 404。
5. 插入 `comment_like`。
6. 非自赞时，在同一事务中调用 `createCommentLikeNotification`。
7. 提交事务。
8. 提交后通过现有 `publishNotificationCreated` 发布实时事件；发布失败只记录警告，
   已提交的点赞和通知由 REST 查询兜底。

`comment.controller.js` 改为调用该专用服务，响应结构保持不变。

### 冷却与并发

`notificationService.createCommentLikeNotification` 复用
`createNotificationWithCooldown`：

- 冷却时间为一小时。
- advisory lock key 包含接收者、操作者和实际评论 ID。
- 最近通知查询使用 `target_type = 'comment'` 和 `target_id = commentId`，避免同一
  文章下不同评论互相占用冷却窗口。

## 前端设计

前端不新增通知请求或 Socket 监听：

- `NotificationType` 增加 `comment_like`。
- `NotificationTargetType` 增加 `comment`。
- 元数据增加可选 `parentCommentId`。
- 通知标题显示“点赞了你的评论”，使用现有点赞图标。
- 元信息优先显示评论摘要，缺失时回退文章标题。
- 点赞一级评论时跳转到 `detail?commentId=<commentId>`。
- 点赞回复时跳转到
  `detail?commentId=<parentCommentId>&replyId=<commentId>`。

现有通知 Store、未读数、Socket `notification:new` 和标记已读逻辑无需修改。

## 错误与边界

- 评论不存在：点赞事务回滚，接口返回失败。
- 自赞：保留点赞关系，但不创建通知。
- 取消点赞：只删除关系，不修改历史通知。
- 冷却内重新点赞：保留点赞关系，不新增通知，也不修改旧通知的已读状态。
- Socket/Redis 发布失败：不回滚数据库事务，用户打开通知面板或重新连接后由 REST
  同步看到通知。
- 删除被点赞评论：现有外键会把通知的 `comment_id` 置空；通知仍可按 `article_id`
  打开文章，前端不附加评论定位参数。

## 测试与验证

- 后端服务测试覆盖新增点赞、取消点赞、自赞、冷却、事务回滚和提交后发布。
- 通知服务测试覆盖 `comment_like` payload、锁 key 和摘要/父评论元数据。
- 迁移测试覆盖新类型、目标类型和一致性约束。
- 控制器测试确认委托专用服务且响应结构不变。
- 前端组件测试覆盖一级评论和回复点赞通知的文案、图标与路由参数。
- 前后端完整测试、前端构建与类型检查通过。
- 对本地 PostgreSQL 执行迁移后，通过真实点赞操作或事务化 SQL 验证
  `comment_like` 与 `notifications` 同时产生，并确认通知 REST 查询可见。
