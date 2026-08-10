# Flow Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure, ordered image attachments and atomic publishing to the Flow composer while preserving its pulled modal, retained draft, keyboard behavior, and existing Gallery presentation.

**Architecture:** Keep Tiptap responsible for structured text and model images as independent ordered attachments. A new Koa media endpoint creates user-owned pending `file` assets; `POST /flow` locks and validates those assets, inserts `flow_post` plus `flow_post_media` in one PostgreSQL transaction, and uses the existing media runtime for local/R2 URLs and promotion.

**Tech Stack:** Vue 3.5, TypeScript, Pinia-free instance composables, Tiptap 3, TanStack Vue Query, Axios, Vitest, Vue Test Utils, Koa 3, `@koa/router`, `@koa/multer`, Sharp, PostgreSQL 18, Node test runner

## Global Constraints

- Flow images are ordered attachments below the editor; never insert image nodes into Flow Tiptap content.
- Accept at most 9 JPEG/PNG/WebP images, at most 10MB per file and 30MB per selection, with 3 concurrent uploads.
- The server must verify magic bytes by decoding, reject SVG/GIF/HEIC, cap decoded input at 40,000,000 pixels, normalize orientation, strip metadata, and write WebP variants at 2560px/640px maximum width.
- Keep `Esc`, the close icon, and the cord as close paths; closing preserves the current page-lifetime draft and attachment list.
- Publish only when normalized text or at least one uploaded image exists, every retained image is uploaded, and no submit is running.
- `POST /flow` accepts media IDs, never client URLs, and atomically validates ownership plus creates all associations.
- Keep existing `articles/{articleId}/...` R2 keys readable; new Flow media uses resource-neutral `media/images/{fileId}/...` keys.
- Preserve unrelated working-tree changes in both repositories.
- Every task follows red-green-refactor and commits only its own files.

---

### Task 1: Add the Flow persistence schema

**Files:**
- Create: `../coderx_server/migrations/012_create_flow_post.sql`
- Create: `../coderx_server/src/service/sql/flow.sql.js`
- Create: `../coderx_server/test/service/flow.sql.test.js`

**Interfaces:**
- Consumes: existing `user(id)` and `file(id)` tables.
- Produces: `flow_post`, `flow_post_media`, `buildInsertFlowSql()`, `buildLockFlowMediaSql(count)`, `buildInsertFlowMediaSql(count)`, `buildFlowFeedSql()` and `buildFlowDetailSql()`.

- [ ] **Step 1: Write the failing SQL contract tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.resolve(__dirname, '../../migrations/012_create_flow_post.sql'), 'utf8');
const flowSql = require('../../src/service/sql/flow.sql');

test('flow migration creates ordered unique media ownership and feed indexes', () => {
  assert.match(migration, /CREATE TABLE flow_post/i);
  assert.match(migration, /UNIQUE \(user_id, client_request_id\)/i);
  assert.match(migration, /CREATE TABLE flow_post_media/i);
  assert.match(migration, /file_id BIGINT NOT NULL UNIQUE/i);
  assert.match(migration, /UNIQUE \(flow_id, position\)/i);
  assert.match(migration, /position BETWEEN 0 AND 8/i);
});

test('flow SQL locks requested image rows for ownership validation', () => {
  const sql = flowSql.buildLockFlowMediaSql(2);
  assert.match(sql, /FROM file f/i);
  assert.match(sql, /LEFT JOIN flow_post_media/i);
  assert.match(sql, /FOR UPDATE OF f/i);
  assert.equal((sql.match(/\?/g) || []).length, 3);
});
```

- [ ] **Step 2: Run the test and confirm the missing-file failure**

Run: `cd ../coderx_server && node --test test/service/flow.sql.test.js`

Expected: FAIL because the migration and SQL helper do not exist.

- [ ] **Step 3: Create the transactional migration**

```sql
BEGIN;

CREATE TABLE flow_post (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON UPDATE RESTRICT ON DELETE CASCADE,
    client_request_id UUID NOT NULL,
    content JSONB NOT NULL CHECK (jsonb_typeof(content) = 'object'),
    body_text TEXT NOT NULL CHECK (char_length(body_text) <= 2000),
    create_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    update_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT flow_post_user_request_uidx UNIQUE (user_id, client_request_id)
);

CREATE INDEX flow_post_feed_idx ON flow_post (create_at DESC, id DESC);
CREATE INDEX flow_post_user_idx ON flow_post (user_id, create_at DESC, id DESC);

CREATE TABLE flow_post_media (
    flow_id BIGINT NOT NULL REFERENCES flow_post(id) ON DELETE CASCADE,
    file_id BIGINT NOT NULL UNIQUE REFERENCES file(id) ON DELETE RESTRICT,
    position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 8),
    alt_text TEXT NOT NULL DEFAULT '' CHECK (char_length(alt_text) <= 200),
    PRIMARY KEY (flow_id, file_id),
    CONSTRAINT flow_post_media_position_uidx UNIQUE (flow_id, position)
);

CREATE INDEX flow_post_media_flow_idx ON flow_post_media (flow_id, position);
CREATE INDEX draft_consumed_article_id_idx ON draft (consumed_article_id) WHERE consumed_article_id IS NOT NULL;

COMMIT;
```

Implement SQL builders with `SqlUtils.queryIn('f.id', mediaIds)`-compatible placeholders. `buildLockFlowMediaSql(count)` must filter `f.user_id = ?`, `f.file_type = 'image'`, `f.article_id IS NULL`, `f.draft_id IS NULL`, and `fm.file_id IS NULL`, then lock `f` rows.

- [ ] **Step 4: Run the SQL contracts**

Run: `cd ../coderx_server && node --test test/service/flow.sql.test.js`

Expected: PASS.

- [ ] **Step 5: Apply and inspect the migration in a development database**

Run: `cd ../coderx_server && PGPASSWORD=123456 psql -h 127.0.0.1 -p 5432 -U postgres -d coderx -v ON_ERROR_STOP=1 -f migrations/012_create_flow_post.sql`

Run: `PGPASSWORD=123456 psql -h 127.0.0.1 -p 5432 -U postgres -d coderx -P pager=off -c '\d+ flow_post' -c '\d+ flow_post_media'`

Expected: both tables, both foreign keys, three unique constraints, and all declared indexes are present.

- [ ] **Step 6: Commit the schema**

```bash
cd ../coderx_server
git add migrations/012_create_flow_post.sql src/service/sql/flow.sql.js test/service/flow.sql.test.js
git commit -m "feat(flow): add post and media schema"
```

---

### Task 2: Close the existing image ownership holes

**Files:**
- Modify: `../coderx_server/src/controller/image.controller.js`
- Modify: `../coderx_server/src/service/image.service.js`
- Modify: `../coderx_server/test/controller/image.controller.test.js`
- Modify: `../coderx_server/test/service/image.service.test.js`

**Interfaces:**
- Consumes: authenticated `ctx.user.id`, article ID and image IDs.
- Produces: `updateImageArticle(userId, articleId, imageIds, coverImageId)` and `deleteOwnedUnattachedImages(userId, imageIds)`; neither method can mutate another user's rows.

- [ ] **Step 1: Add failing authorization tests**

```js
test('updateFile forwards the authenticated user to the ownership-checked service', async () => {
  const calls = [];
  const imageService = {
    async updateImageArticle(userId, articleId, imageIds, coverImageId) {
      calls.push({ userId, articleId, imageIds, coverImageId });
      return { success: true };
    },
  };
  const controller = loadControllerWithMocks({ imageService });
  const ctx = { user: { id: 7 }, params: { articleId: '15' }, request: { body: { uploaded: [{ id: 41, isCover: false }] } } };

  await controller.updateFile(ctx);

  assert.deepEqual(calls, [{ userId: 7, articleId: '15', imageIds: [41], coverImageId: null }]);
});

test('deleteFile refuses images that are owned by another user or already attached', async () => {
  const imageService = { async deleteOwnedUnattachedImages() { throw new BusinessError('图片不可删除', 403); } };
  const controller = loadControllerWithMocks({ imageService, mediaRuntime: {} });
  const ctx = { user: { id: 7 }, request: { body: { uploaded: [{ id: 41 }] } } };
  await assert.rejects(() => controller.deleteFile(ctx), /图片不可删除/);
});
```

Add service tests that assert article ownership is checked before any link update and all selected files are filtered by `user_id`, `article_id IS NULL`, `draft_id IS NULL`, and no `flow_post_media` row.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `cd ../coderx_server && node --test test/controller/image.controller.test.js test/service/image.service.test.js`

Expected: FAIL because controllers do not pass `userId` and service SQL is not owner-scoped.

- [ ] **Step 3: Implement owner-scoped mutations**

In `updateImageArticle`, lock the article with:

```sql
SELECT id FROM article WHERE id = ? AND user_id = ? FOR UPDATE;
```

Lock selected files with:

```sql
SELECT f.id
FROM file f
LEFT JOIN flow_post_media fm ON fm.file_id = f.id
WHERE f.id = ANY(?::bigint[])
  AND f.user_id = ?
  AND f.file_type = 'image'
  AND (f.article_id IS NULL OR f.article_id = ?)
  AND f.draft_id IS NULL
  AND fm.file_id IS NULL
FOR UPDATE OF f;
```

Require the returned ID count to equal the deduplicated requested count. For deletion, perform the same user/unattached lock, stage R2 and local outbox entries, delete rows inside the transaction, commit, then process the outbox. Pass `ctx.user.id` from both controller actions and validate `uploaded` is an array of safe positive IDs.

- [ ] **Step 4: Run the focused tests**

Run: `cd ../coderx_server && node --test test/controller/image.controller.test.js test/service/image.service.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the authorization fix**

```bash
cd ../coderx_server
git add src/controller/image.controller.js src/service/image.service.js test/controller/image.controller.test.js test/service/image.service.test.js
git commit -m "fix(media): enforce image ownership"
```

---

### Task 3: Build the safe pending-image endpoint

**Files:**
- Create: `../coderx_server/src/router/media.router.js`
- Create: `../coderx_server/src/controller/media.controller.js`
- Create: `../coderx_server/src/service/mediaImage.service.js`
- Create: `../coderx_server/src/middleware/mediaImage.middleware.js`
- Create: `../coderx_server/test/controller/media.controller.test.js`
- Create: `../coderx_server/test/service/mediaImage.service.test.js`
- Modify: `../coderx_server/src/constants/upload.js`

**Interfaces:**
- Consumes: multipart field `image`, authenticated user ID and existing `file`/`image_meta` tables.
- Produces: `POST /media/images`, `DELETE /media/images/:mediaId`, and `MediaImageAsset { id, url, thumbnailUrl, mimeType, sizeBytes, width, height }`.

- [ ] **Step 1: Write failing validation and compensation tests**

Cover these exact cases: JPEG/PNG/WebP accepted; SVG and forged JPEG rejected; 10MB+1 rejected; 40,000,001 pixels rejected; generated name matches `/^[0-9a-f-]+\.webp$/`; a DB failure unlinks both generated files; delete passes `ctx.user.id` and normalized ID to the service.

```js
test('normalizeImage rejects active SVG content', async () => {
  const service = createMediaImageService(testDependencies());
  await assert.rejects(
    () => service.normalizeImage(Buffer.from('<svg><script>alert(1)</script></svg>')),
    /JPEG、PNG 或 WebP/,
  );
});
```

- [ ] **Step 2: Run tests and confirm missing-module failures**

Run: `cd ../coderx_server && node --test test/controller/media.controller.test.js test/service/mediaImage.service.test.js`

Expected: FAIL because the media endpoint files do not exist.

- [ ] **Step 3: Implement single-file memory upload and Sharp normalization**

Add constants:

```js
const MAX_FLOW_IMAGE_COUNT = 9;
const MAX_FLOW_IMAGE_FILE_SIZE_MB = 10;
const MAX_FLOW_IMAGE_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FLOW_IMAGE_PIXELS = 40_000_000;
const FLOW_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
```

Configure Multer `memoryStorage()`, `.single('image')`, the 10MB limit and MIME allowlist. In the service, construct `sharp(buffer, { failOn: 'warning', limitInputPixels: MAX_FLOW_IMAGE_PIXELS })`, call `metadata()` to force decode, then write:

```js
const baseName = crypto.randomUUID();
const originalName = `${baseName}.webp`;
const smallName = `${baseName}-small.webp`;
const original = await image.rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
const small = await sharp(original).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
```

Write both buffers, insert `file` and `image_meta` in one transaction with real output dimensions, and unlink both paths if any later step fails. Return URLs through `mediaRuntime.resolveImageUrl(id, { variant })`, falling back to the existing local route until media catalog rows exist.

- [ ] **Step 4: Implement owner-scoped idempotent deletion**

`DELETE /media/images/:mediaId` locks exactly one row by `id + user_id`, rejects an article/draft/Flow association, stages R2 deletion and local cleanup, deletes the DB row, commits, and consumes the outbox. A missing row returns success so retry is idempotent.

- [ ] **Step 5: Run the focused media tests**

Run: `cd ../coderx_server && node --test test/controller/media.controller.test.js test/service/mediaImage.service.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the safe endpoint**

```bash
cd ../coderx_server
git add src/router/media.router.js src/controller/media.controller.js src/service/mediaImage.service.js src/middleware/mediaImage.middleware.js src/constants/upload.js test/controller/media.controller.test.js test/service/mediaImage.service.test.js
git commit -m "feat(media): add safe pending image upload"
```

---

### Task 4: Generalize media promotion and orphan cleanup

**Files:**
- Modify: `../coderx_server/src/utils/mediaObjectKey.js`
- Modify: `../coderx_server/src/service/mediaPromotion.service.js`
- Modify: `../coderx_server/src/tasks/cleanOrphanFiles.sql.js`
- Modify: `../coderx_server/test/service/mediaObjectKey.test.js`
- Modify: `../coderx_server/test/tasks/cleanOrphanFiles.test.js`

**Interfaces:**
- Consumes: legacy article-scoped promotion calls and new resource-neutral calls.
- Produces: `buildMediaObjectKey({ articleId?, fileId, ... })`, where omitted `articleId` creates `media/...`; orphan SQL that excludes `flow_post_media` references.

- [ ] **Step 1: Add failing compatibility and orphan tests**

```js
test('buildMediaObjectKey creates neutral keys when articleId is omitted', () => {
  assert.equal(
    buildMediaObjectKey({ fileId: 512, sha256: SHA256, variant: 'small', extension: 'webp' }),
    `media/images/512/${SHA256.slice(0, 12)}-small.webp`,
  );
});

test('image orphan SQL excludes files attached to Flow', () => {
  const sql = buildFindOrphanFilesSql('image', 'DAY');
  assert.match(sql, /NOT EXISTS\s*\(\s*SELECT 1 FROM flow_post_media fm WHERE fm\.file_id = f\.id\s*\)/i);
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `cd ../coderx_server && node --test test/service/mediaObjectKey.test.js test/tasks/cleanOrphanFiles.test.js`

Expected: FAIL because `articleId` is mandatory and Flow is absent from orphan SQL.

- [ ] **Step 3: Add the neutral key branch without changing legacy output**

```js
const scope = articleId == null
  ? 'media'
  : `articles/${normalizePositiveId(articleId, 'articleId')}`;
return `${scope}/${mediaDirectory}/${normalizedFileId}/${sha256.slice(0, 12)}-${variant}.${normalizedExtension}`;
```

Make `MediaPromotionService.promote()` pass `articleId` only when supplied. Add the `NOT EXISTS` Flow association predicate to both image and video orphan queries, keeping all current draft/video-poster predicates.

- [ ] **Step 4: Run focused and existing media tests**

Run: `cd ../coderx_server && node --test test/service/mediaObjectKey.test.js test/service/mediaPromotion.service.test.js test/tasks/cleanOrphanFiles.test.js`

Expected: PASS and all legacy article-key assertions remain unchanged.

- [ ] **Step 5: Commit the storage lifecycle change**

```bash
cd ../coderx_server
git add src/utils/mediaObjectKey.js src/service/mediaPromotion.service.js src/tasks/cleanOrphanFiles.sql.js test/service/mediaObjectKey.test.js test/tasks/cleanOrphanFiles.test.js
git commit -m "feat(media): support flow-owned objects"
```

---

### Task 5: Implement atomic Flow create and query APIs

**Files:**
- Create: `../coderx_server/src/router/flow.router.js`
- Create: `../coderx_server/src/controller/flow.controller.js`
- Create: `../coderx_server/src/service/flow.service.js`
- Create: `../coderx_server/src/utils/flowContent.js`
- Create: `../coderx_server/test/controller/flow.controller.test.js`
- Create: `../coderx_server/test/service/flow.service.test.js`
- Create: `../coderx_server/test/integration/flowMedia.postgres.test.js`

**Interfaces:**
- Consumes: `CreateFlowInput { clientRequestId: string, content: object, mediaIds: number[] }` and authenticated user ID.
- Produces: `POST /flow`, `GET /flow`, `GET /flow/:flowId`; `FlowItem` responses with `body`, `bodyHtml`, ordered `media`, author and counters.

- [ ] **Step 1: Write failing controller and service tests**

Cover: invalid UUID; malformed Tiptap doc; over 2000 text chars; empty text plus no media; more than 9 media IDs; duplicate IDs; missing/foreign/attached/non-image media; idempotent retry; order preservation; rollback when one association fails.

```js
test('createFlow locks and binds only current-user unattached images in order', async () => {
  const result = await service.createFlow(7, {
    clientRequestId: '4f95672f-4f8e-4cc1-9953-7ba4c2d5f4cf',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }] },
    mediaIds: [42, 41],
  });
  assert.equal(result.id, 90);
  assert.deepEqual(insertedMedia, [{ flowId: 90, fileId: 42, position: 0 }, { flowId: 90, fileId: 41, position: 1 }]);
});
```

- [ ] **Step 2: Run tests and confirm missing-module failures**

Run: `cd ../coderx_server && node --test test/controller/flow.controller.test.js test/service/flow.service.test.js`

Expected: FAIL because the Flow domain files do not exist.

- [ ] **Step 3: Implement content validation and atomic create**

Validate a root `{ type: 'doc' }`, recursively reject `image` and `video` nodes, derive text with `docToExcerpt(content, 2001)`, and reject text longer than 2000. Derive HTML with `docToHtml(content)`; never accept HTML from the request.

Inside one transaction:

```js
const uniqueMediaIds = [...new Set(mediaIds)];
const [existing] = await conn.execute(buildFindFlowByRequestIdSql(), [userId, clientRequestId]);
if (existing[0]) return hydrateFlow(existing[0]);
const [lockedMedia] = await conn.execute(buildLockFlowMediaSql(uniqueMediaIds.length), [userId, ...uniqueMediaIds]);
if (lockedMedia.length !== uniqueMediaIds.length) throw new BusinessError('图片不可用于此 Flow', 409);
const [flowResult] = await conn.execute(buildInsertFlowSql(), [userId, clientRequestId, JSON.stringify(content), bodyText]);
const flowId = flowResult.insertId;
await conn.execute(buildInsertFlowMediaSql(uniqueMediaIds.length), uniqueMediaIds.flatMap((fileId, position) => [flowId, fileId, position]));
```

`buildInsertFlowSql()` must use `ON CONFLICT (user_id, client_request_id) DO NOTHING RETURNING id`. If `insertId` is absent, roll back the unused transaction and select the existing Flow by `(user_id, client_request_id)`; do not try another statement inside an aborted PostgreSQL transaction. Commit before starting idempotent neutral-key media promotion.

- [ ] **Step 4: Implement feed/detail hydration**

Query keyset-compatible ordering `(create_at DESC, id DESC)`, aggregate media by `position`, and resolve each file through `mediaRuntime.resolveImageUrl(fileId, { variant: ORIGINAL|SMALL })`. Return `thumbnailUrl` for the Feed and `url` for the lightbox. Use the existing avatar URL hydration utility.

- [ ] **Step 5: Run unit and PostgreSQL concurrency tests**

Run: `cd ../coderx_server && node --test test/controller/flow.controller.test.js test/service/flow.service.test.js`

Run: `cd ../coderx_server && node --test test/integration/flowMedia.postgres.test.js`

Expected: PASS; the integration test proves two users/requests cannot bind the same file and a repeated `clientRequestId` returns one Flow.

- [ ] **Step 6: Commit the Flow API**

```bash
cd ../coderx_server
git add src/router/flow.router.js src/controller/flow.controller.js src/service/flow.service.js src/utils/flowContent.js test/controller/flow.controller.test.js test/service/flow.service.test.js test/integration/flowMedia.postgres.test.js
git commit -m "feat(flow): publish posts with ordered media"
```

---

### Task 6: Add typed client services and the upload queue

**Files:**
- Modify: `src/service/flow/flow.types.ts`
- Modify: `src/service/flow/flow.request.ts`
- Create: `src/components/tiptap-editor-flow/uploadPolicy.ts`
- Create: `src/composables/useFlowImageUploads.ts`
- Create: `src/service/flow/test/flow.request.test.ts`
- Create: `src/composables/test/useFlowImageUploads.test.ts`

**Interfaces:**
- Consumes: `File[]`, the media API and an optional upload adapter for tests.
- Produces: `attachments`, `addFiles`, `retry`, `remove`, `move`, `isUploading`, `hasFailed`, `uploadedMediaIds`, `dispose`.

- [ ] **Step 1: Write failing request and queue tests**

Test exact multipart key `image`, `DELETE /media/images/:id`, `POST /flow`, 9/10MB/30MB boundaries, stable order, max concurrency 3, partial failure, retry, deleting uploaded assets, and object URL revocation.

```ts
expect(validateFlowImageFiles(files, 0)).toEqual({ accepted: files.slice(0, 9), rejected: [] });
expect(maxObservedConcurrency).toBe(3);
expect(queue.uploadedMediaIds.value).toEqual([42, 41]);
expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
```

- [ ] **Step 2: Run tests and confirm missing-export failures**

Run: `pnpm vitest run src/service/flow/test/flow.request.test.ts src/composables/test/useFlowImageUploads.test.ts`

Expected: FAIL because the policy and composable do not exist.

- [ ] **Step 3: Define strict contracts and requests**

```ts
export type FlowUploadStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

export interface FlowImageAsset {
  id: number;
  url: string;
  thumbnailUrl: string;
  mimeType: 'image/webp';
  sizeBytes: number;
  width: number;
  height: number;
}

export interface FlowImageAttachment {
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

export interface CreateFlowPayload {
  clientRequestId: string;
  content: TiptapDocContent;
  mediaIds: number[];
}
```

Add `uploadFlowImage(file, onProgress)`, `deletePendingFlowImage(id)`, `createFlow(payload)`, API-backed `getFlowFeed`, and `getFlowItemById`. Validate `res.code === 0` and the response shape before returning typed data.

- [ ] **Step 4: Implement the instance-scoped queue**

Use stable `crypto.randomUUID()` client IDs, immediate `URL.createObjectURL(file)`, a FIFO scheduler with `activeCount < 3`, progress updates, and explicit terminal errors. `remove()` cancels queued work, aborts an active Axios request, or calls the pending-delete endpoint for uploaded media. `dispose()` aborts every active request and revokes every object URL, but closing the modal must not call it because close preserves the draft.

- [ ] **Step 5: Run request and queue tests**

Run: `pnpm vitest run src/service/flow/test/flow.request.test.ts src/composables/test/useFlowImageUploads.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit client data foundations**

```bash
git add src/service/flow/flow.types.ts src/service/flow/flow.request.ts src/components/tiptap-editor-flow/uploadPolicy.ts src/composables/useFlowImageUploads.ts src/service/flow/test/flow.request.test.ts src/composables/test/useFlowImageUploads.test.ts
git commit -m "feat(flow): add image upload queue"
```

---

### Task 7: Build the attachment picker and grid

**Files:**
- Create: `src/components/tiptap-editor-flow/FlowAttachmentPicker.vue`
- Create: `src/components/tiptap-editor-flow/FlowAttachmentGrid.vue`
- Create: `src/components/tiptap-editor-flow/test/FlowAttachmentPicker.test.ts`
- Create: `src/components/tiptap-editor-flow/test/FlowAttachmentGrid.test.ts`

**Interfaces:**
- Consumes: attachment state and remaining count.
- Produces: `files`, `retry`, `remove`, `move` and `preview` events.

- [ ] **Step 1: Write failing accessible component tests**

Assert the picker accepts JPEG/PNG/WebP with `multiple`, button activation opens the input, drop and paste emit the same `files` event, and the grid exposes per-item progress, retry/delete labels, keyboard move buttons, and live status text.

```ts
expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('image/jpeg,image/png,image/webp');
expect(wrapper.get('[aria-live="polite"]').text()).toContain('2 张图片上传中');
await wrapper.get('[aria-label="将第 2 张图片前移"]').trigger('click');
expect(wrapper.emitted('move')?.[0]).toEqual([1, 0]);
```

- [ ] **Step 2: Run tests and confirm component-not-found failures**

Run: `pnpm vitest run src/components/tiptap-editor-flow/test/FlowAttachmentPicker.test.ts src/components/tiptap-editor-flow/test/FlowAttachmentGrid.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement the picker**

Place one quiet image icon button after the Flow link control. Use a visually hidden input, prevent document navigation on image drag-over/drop, filter clipboard items to files, and emit all candidate files to the shared policy. Disable the control at 9 retained attachments and label it `添加图片，最多 9 张`.

- [ ] **Step 4: Implement the grid**

Render attachments under the editor in retained order. Each tile uses `previewUrl`, an upload/failed overlay, retry and remove controls, a visible focus ring, and previous/next buttons for keyboard ordering. Use `VueEasyLightbox` for uploaded previews. Keep card radius at 8–12px and use existing Flow surface tokens; do not introduce a second modal or decorative animation.

- [ ] **Step 5: Run component tests**

Run: `pnpm vitest run src/components/tiptap-editor-flow/test/FlowAttachmentPicker.test.ts src/components/tiptap-editor-flow/test/FlowAttachmentGrid.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the attachment UI**

```bash
git add src/components/tiptap-editor-flow/FlowAttachmentPicker.vue src/components/tiptap-editor-flow/FlowAttachmentGrid.vue src/components/tiptap-editor-flow/test/FlowAttachmentPicker.test.ts src/components/tiptap-editor-flow/test/FlowAttachmentGrid.test.ts
git commit -m "feat(flow): add image attachment UI"
```

---

### Task 8: Integrate structured content, publish state, and Feed refresh

**Files:**
- Modify: `src/components/tiptap-editor-flow/TiptapEditorFlow.vue`
- Modify: `src/views/flow/cpns/FlowEditorModal.vue`
- Modify: `src/views/flow/Flow.vue`
- Modify: `src/composables/useFlowFeed.ts`
- Modify: `src/views/flow/cpns/FlowFeedItem.vue`
- Modify: `src/views/flow/cpns/FlowMediaGallery.vue`
- Modify: `src/views/flow/cpns/test/FlowEditorModal.test.ts`
- Create: `src/components/tiptap-editor-flow/test/TiptapEditorFlow.test.ts`
- Modify: `src/views/flow/cpns/test/FlowMediaGallery.test.ts`
- Modify: `src/views/flow/cpns/test/FlowFeedItem.test.ts`

**Interfaces:**
- Consumes: `useFlowImageUploads`, `createFlow`, Tiptap JSON, Vue Query client.
- Produces: complete Flow composer publishing and API-backed rendering.

- [ ] **Step 1: Write failing integration tests**

Assert `TiptapEditorFlow` emits JSON, image paste/drop is delegated to the attachment picker instead of creating Tiptap image nodes, publish is disabled for empty/uploading/failed states, one click sends ordered IDs with a stable UUID, success resets state and refetches the Feed, failure retains state, close/reopen retains state, Gallery uses `thumbnailUrl`, and Feed HTML is sanitized.

```ts
expect(createFlow).toHaveBeenCalledWith({
  clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  mediaIds: [42, 41],
});
expect(wrapper.get('.flow-media-gallery img').attributes('src')).toBe(item.media[0].thumbnailUrl);
expect(wrapper.html()).not.toContain('onerror=');
```

- [ ] **Step 2: Run focused integration tests and confirm failure**

Run: `pnpm vitest run src/components/tiptap-editor-flow/test/TiptapEditorFlow.test.ts src/views/flow/cpns/test/FlowEditorModal.test.ts src/views/flow/cpns/test/FlowMediaGallery.test.ts src/views/flow/cpns/test/FlowFeedItem.test.ts`

Expected: FAIL because Flow only emits HTML, publish is disabled, and Gallery uses original URLs.

- [ ] **Step 3: Emit canonical Tiptap JSON**

Add `update:json` with `editorInstance.getJSON()` on every update and initialization while preserving the current HTML event temporarily for compatibility. Do not register `ImageNode` or `ImageUpload` in Flow config.

- [ ] **Step 4: Orchestrate publish in the modal**

Mount the picker/grid under Tiptap, create the queue once for the modal lifetime, and compute:

```ts
const canPublish = computed(() =>
  !publishing.value &&
  !uploads.isUploading.value &&
  !uploads.hasFailed.value &&
  (plainText.value.trim().length > 0 || uploads.uploadedMediaIds.value.length > 0),
);
```

Generate `clientRequestId` when a new draft starts and keep it unchanged across retry. On success call `uploads.dispose()`, reset content and request ID, emit `published`, then close. On failure keep all state. Keep existing Escape, focus trap, body scroll lock, no-backdrop-close rule and `v-show` retention.

- [ ] **Step 5: Refresh and render the real Feed**

On `published`, call `queryClient.invalidateQueries({ queryKey: flowKeys.feed() })`. Sanitize `bodyHtml` with DOMPurify before `v-html`. Use `thumbnailUrl || url` for gallery tiles and `url` for lightbox. Keep the mock fixture only in tests; production requests use the server API.

- [ ] **Step 6: Run focused Flow tests**

Run: `pnpm vitest run src/components/tiptap-editor-flow/test/TiptapEditorFlow.test.ts src/components/tiptap-editor-flow/test/FlowAttachmentPicker.test.ts src/components/tiptap-editor-flow/test/FlowAttachmentGrid.test.ts src/views/flow/cpns/test/FlowEditorModal.test.ts src/views/flow/cpns/test/FlowMediaGallery.test.ts src/views/flow/cpns/test/FlowFeedItem.test.ts src/views/flow/cpns/test/FlowCordWidget.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the complete composer**

```bash
git add src/components/tiptap-editor-flow src/views/flow src/composables/useFlowFeed.ts
git commit -m "feat(flow): publish posts with image attachments"
```

---

### Task 9: End-to-end verification and rollout guardrails

**Files:**
- Modify: `../coderx_server/.env.example`
- Create: `../coderx_server/test/integration/flowImageLifecycle.postgres.test.js`
- Create: `src/views/flow/test/flow-image-upload.e2e.md`

**Interfaces:**
- Consumes: all server and client work from Tasks 1–8.
- Produces: repeatable lifecycle verification and operator-visible limits.

- [ ] **Step 1: Add a lifecycle integration test**

The test must create a user-owned pending image, create a Flow with that ID, assert one ordered `flow_post_media` row, assert the orphan query no longer selects it, delete the Flow and verify the file can be staged for cleanup. Run each fixture inside a transaction and roll it back.

- [ ] **Step 2: Document runtime limits**

Add these exact values to `.env.example` comments and the manual E2E checklist: 9 files/post, 10MB/file, 30MB/selection, 40MP decoded limit, 3 client uploads, 7-day pending orphan TTL.

- [ ] **Step 3: Run server verification**

Run: `cd ../coderx_server && npm test`

Run: `cd ../coderx_server && npm run test:media-db`

Expected: all unit/controller/task and PostgreSQL integration tests PASS.

- [ ] **Step 4: Run client verification**

Run: `pnpm vitest run src/components/tiptap-editor-flow src/composables/test/useFlowImageUploads.test.ts src/service/flow/test/flow.request.test.ts src/views/flow`

Run: `pnpm type-check && pnpm lint && pnpm build-only`

Expected: all commands exit 0.

- [ ] **Step 5: Perform browser acceptance**

At desktop and 390px width, verify selection, paste, drop, nine-image limit, upload progress, one failure and retry, removal, keyboard reorder, close/reopen retention, `Esc`, cord close, publish, Feed-first-page refresh, small image network URLs, original lightbox URLs, reduced motion, expired auth and offline retry. Confirm opening or closing the composer never changes `window.scrollY`.

- [ ] **Step 6: Audit the database and physical media after acceptance**

Run read-only queries for duplicate `flow_post_media.file_id`, position gaps/duplicates, cross-user ownership mismatches, and old unattached images. Run the existing media inventory and confirm no newly created disk file lacks a `file` row.

- [ ] **Step 7: Commit verification artifacts**

```bash
cd ../coderx_server
git add .env.example test/integration/flowImageLifecycle.postgres.test.js
git commit -m "test(flow): cover image lifecycle"
cd ../coderx
git add src/views/flow/test/flow-image-upload.e2e.md
git commit -m "docs(flow): add image upload acceptance"
```
