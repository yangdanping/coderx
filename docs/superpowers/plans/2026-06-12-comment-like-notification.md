# Comment Like Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the comment-like notification loop from the transactional `comment_like` write through `notifications`, Socket.IO delivery, REST fallback, and frontend navigation.

**Architecture:** Add a dedicated backend comment-like producer that mirrors the existing article-like transaction while delegating persistence and cooldown behavior to the shared notification service. Extend the notification schema with a semantic `comment` target, then teach the existing frontend notification component to render and navigate this new type without adding another transport or store.

**Tech Stack:** Node.js, Koa, PostgreSQL, Socket.IO/Redis event bus, Vue 3, Pinia, Vitest, Node test runner

---

## File Map

Backend repository: `/Users/yangdanping/Desktop/personal_project/coderx_server/.worktrees/comment-like-notification`

- Create `migrations/006_expand_notifications_for_comment_like.sql`: add the new notification type and comment target constraints.
- Modify `migrations/README.md`: record migration 006.
- Modify `src/service/notification.service.js`: create comment-like notifications through the shared cooldown helper.
- Create `src/service/commentLike.service.js`: own the comment-like transaction and post-commit event publication.
- Modify `src/controller/comment.controller.js`: delegate comment likes to the dedicated service.
- Modify `test/service/notification.sql.test.js`: verify migration constraints.
- Modify `test/service/notification.service.test.js`: verify comment-like payload and cooldown behavior.
- Create `test/service/commentLike.service.test.js`: verify transaction, self-like, unlike, rollback, and publish behavior.
- Modify `test/controller/comment.controller.test.js`: verify controller delegation and response compatibility.

Frontend repository: `/Users/yangdanping/Desktop/personal_project/coderx/.worktrees/comment-like-notification`

- Modify `src/stores/types/notification.result.ts`: add `comment_like`, `comment`, and parent-comment metadata.
- Modify `src/components/navbar/cpns/NavBarNotification.vue`: add copy, metadata fallback, icon selection, and route query construction.
- Modify `src/components/navbar/cpns/test/NavBarNotification.test.ts`: cover top-level comment and reply likes.

### Task 1: Extend the notification schema and shared notification service

- [ ] **Step 1: Write failing migration and notification-service tests**

Add a migration assertion that requires:

```js
assert.match(sql, /comment_like/i);
assert.match(sql, /target_type\s+IN\s*\([^)]*'comment'/i);
assert.match(sql, /type\s*=\s*'comment_like'[\s\S]*target_type\s*=\s*'comment'/i);
```

Add a service test that calls:

```js
await service.createCommentLikeNotification({
  recipientId: 10,
  actorId: 20,
  articleId: 30,
  commentId: 40,
  parentCommentId: 35,
  content: '<p>liked reply</p>',
});
```

Assert the advisory lock key is `comment_like:10:20:comment:40`, the cooldown lookup key is
`[10, 20, 'comment_like', 'comment', 40]`, and the insert payload contains:

```js
[10, 20, 'comment_like', 'comment', 40, 30, 40, JSON.stringify({
  commentExcerpt: 'liked reply',
  parentCommentId: 35,
})]
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test test/service/notification.sql.test.js test/service/notification.service.test.js
```

Expected: failures because migration 006 and `createCommentLikeNotification` do not exist.

- [ ] **Step 3: Implement migration 006 and the notification method**

The migration must:

```sql
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('article_like', 'article_comment', 'comment_reply', 'follow', 'comment_like'));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_target_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_target_type_check
  CHECK (target_type IN ('article', 'user', 'comment'));
```

Drop both historical consistency constraint names if present, then add one constraint that preserves:

- article notification types target their article,
- follow notifications target their recipient user,
- comment-like notifications target the actual `comment_id`.

Implement `createCommentLikeNotification` with a one-hour cooldown using
`createNotificationWithCooldown`, a comment-specific lock key, sanitized 60-character excerpt,
and optional `parentCommentId`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --test test/service/notification.sql.test.js test/service/notification.service.test.js
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit backend notification model changes**

```bash
git add migrations src/service/notification.service.js test/service/notification.sql.test.js test/service/notification.service.test.js
git commit -m "feat(notification): support comment like events"
```

### Task 2: Add the transactional comment-like producer

- [ ] **Step 1: Write failing producer and controller tests**

Create tests proving:

- unlike deletes and commits without notification;
- new like queries comment author/article/parent/content, inserts `comment_like`, creates the
  notification on the same connection, commits, then publishes;
- self-like commits without notification;
- missing comment rolls back with 404;
- publish failure does not roll back the committed database transaction.

Update controller tests to expect:

```js
commentLikeService.toggleCommentLike(commentId, userId)
```

while preserving:

```js
Result.success({ liked: result.isLiked, likes })
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test test/service/commentLike.service.test.js test/controller/comment.controller.test.js
```

Expected: failure because the dedicated service and controller delegation do not exist.

- [ ] **Step 3: Implement the dedicated service**

Use a transaction with this shape:

```js
const [deleteResult] = await conn.execute(
  'DELETE FROM comment_like WHERE comment_id = ? AND user_id = ?;',
  [commentId, userId],
);

if (deleteResult.affectedRows > 0) {
  await conn.commit();
  return { isLiked: false, action: 'unliked', notificationCreated: false, notification: null };
}
```

Query:

```sql
SELECT
  user_id AS "authorId",
  article_id AS "articleId",
  comment_id AS "parentCommentId",
  content
FROM comment
WHERE id = ?
LIMIT 1;
```

Insert the like, call `createCommentLikeNotification` on the same connection when it is not a
self-like, commit, and publish through the existing `publishNotificationCreated` event bus.

- [ ] **Step 4: Update the controller**

Replace the generic `userService.toggleLike('comment', ...)` call with
`commentLikeService.toggleCommentLike(commentId, userId)`. Keep the existing count lookup and API
response unchanged.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
node --test test/service/commentLike.service.test.js test/controller/comment.controller.test.js
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit backend producer changes**

```bash
git add src/service/commentLike.service.js src/controller/comment.controller.js test/service/commentLike.service.test.js test/controller/comment.controller.test.js
git commit -m "feat(comment): notify authors about likes"
```

### Task 3: Render and navigate comment-like notifications

- [ ] **Step 1: Write failing component tests**

Add one top-level notification:

```ts
{
  type: 'comment_like',
  targetType: 'comment',
  targetId: 41,
  articleId: 31,
  commentId: 41,
  metadata: { commentExcerpt: '一级评论内容' },
}
```

Assert title `点赞了你的评论`, like icon, excerpt, and navigation:

```ts
{
  name: 'detail',
  params: { articleId: 31 },
  query: { commentId: '41' },
}
```

Add a reply notification with `commentId: 42` and `metadata.parentCommentId: 40`; assert navigation
uses `{ commentId: '40', replyId: '42' }`.

- [ ] **Step 2: Run focused frontend test and verify RED**

Run:

```bash
pnpm vitest run src/components/navbar/cpns/test/NavBarNotification.test.ts
```

Expected: failures because `comment_like` falls through to article-like copy and lacks comment
navigation.

- [ ] **Step 3: Implement types and presentation**

Extend types:

```ts
export type NotificationType =
  | 'article_like'
  | 'comment_like'
  | 'article_comment'
  | 'comment_reply'
  | 'follow';
export type NotificationTargetType = 'article' | 'comment' | 'user';
```

Add optional `parentCommentId` to metadata. Treat `comment_like` as a like icon, but as a
comment-target notification for excerpt and query construction. For replies, use
`parentCommentId` as `commentId` and the actual notification `commentId` as `replyId`.

- [ ] **Step 4: Run focused frontend test and verify GREEN**

Run:

```bash
pnpm vitest run src/components/navbar/cpns/test/NavBarNotification.test.ts
```

Expected: all component tests pass.

- [ ] **Step 5: Commit frontend changes**

```bash
git add src/stores/types/notification.result.ts src/components/navbar/cpns/NavBarNotification.vue src/components/navbar/cpns/test/NavBarNotification.test.ts
git commit -m "feat(notification): display comment like events"
```

### Task 4: Apply migration and verify the complete chain

- [ ] **Step 1: Run complete automated verification**

Backend:

```bash
npm test
```

Frontend:

```bash
pnpm vitest run
pnpm type-check
pnpm build-only
```

Expected: all commands exit 0.

- [ ] **Step 2: Apply migration 006 to local PostgreSQL**

```bash
PGPASSWORD=123456 psql -h 127.0.0.1 -p 5432 -U postgres -d coderx \
  -f migrations/006_expand_notifications_for_comment_like.sql
```

Expected: transaction commits and the notification constraints include `comment_like` and
`comment`.

- [ ] **Step 3: Verify schema and a real service-level like**

Query the constraints with `\d+ notifications`, then invoke the service against an existing
cross-user comment inside a script or use the running API with authenticated users. Verify:

- `comment_like` relation exists;
- one `notifications` row exists with `type = 'comment_like'`;
- recipient is the comment author;
- `target_id` and `comment_id` identify the liked comment;
- `article_id` identifies the article;
- self-like and unlike paths create no notification.

- [ ] **Step 4: Review final diffs**

Run in both repositories:

```bash
git diff HEAD~2 --check
git status --short
```

Confirm there are no unrelated Flow/profile changes and no generated files.
