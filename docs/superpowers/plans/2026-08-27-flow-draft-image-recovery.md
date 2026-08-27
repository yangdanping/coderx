# Flow Draft Image Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore successfully uploaded Flow draft images, in order, after a full page refresh without allowing Tiptap hydration events to erase `meta.imageIds`.

**Architecture:** The server hydrates every Flow draft response with ordered, ownership-checked `FlowImageAsset` records. The client persists those descriptors in its local fallback, hydrates them into the existing upload queue as uploaded attachments, and holds a page-level restore lock until media and document props have reached the modal.

**Tech Stack:** Vue 3 Composition API, TypeScript, Tiptap, TanStack Vue Query, Vitest, Koa, Node test runner, PostgreSQL.

## Global Constraints

- Restore only images whose upload completed successfully; queued, uploading, and failed local files do not survive refresh.
- Keep images in the independent Flow attachment queue; do not add Tiptap image nodes.
- Keep `meta.imageIds` as the canonical ordered binding list.
- Do not add a general-purpose media lookup endpoint.
- Do not mutate or rebind existing database rows `559` and `560` as part of the code fix.
- Add short comments only at the restore race and remote preview URL lifecycle boundaries.
- Preserve unrelated changes already present in both worktrees.

---

## File Map

### Server repository: `/Users/yangdanping/Desktop/personal_project/coderx_server`

- `src/service/draft.service.js`: hydrate ordered Flow image assets and reject incomplete bindings.
- `test/service/draft.service.test.js`: service-level red/green coverage for ordered, empty, and incomplete image recovery.
- `test/controller/flowDraft.controller.test.js`: preserve the response envelope containing hydrated images.

### Client repository: `/Users/yangdanping/Desktop/personal_project/coderx`

- `src/service/flow/flow-draft.types.ts`: define restorable Flow draft and local fallback image descriptors.
- `src/service/flow/flow.types.ts`: allow restored uploaded attachments without a local `File`.
- `src/composables/useFlowDraftAutosave.ts`: persist schema-v2 local assets and return the selected restorable state.
- `src/composables/useFlowImageUploads.ts`: hydrate remote assets without uploading or revoking remote URLs.
- `src/components/tiptap-editor-flow/FlowAttachmentGrid.vue`: render restored attachments without depending on `file.name`.
- `src/views/flow/cpns/FlowEditorModal.vue`: accept and hydrate restored assets.
- `src/views/flow/Flow.vue`: order media/document restoration and gate hydration events.
- Focused tests beside each component/composable: prove the regression before implementation.

---

### Task 1: Hydrate Ordered Flow Draft Images on the Server

**Files:**
- Modify: `/Users/yangdanping/Desktop/personal_project/coderx_server/test/service/draft.service.test.js`
- Modify: `/Users/yangdanping/Desktop/personal_project/coderx_server/src/service/draft.service.js`

**Interfaces:**
- Consumes: `draft.meta.imageIds`, `draft.id`, `draft.userId`, `mediaRuntime.resolveImageUrl(fileId, { variant })`.
- Produces: every Flow draft record has `images: Array<{ id, url, thumbnailUrl, mimeType, sizeBytes, width, height }>` in `meta.imageIds` order.

- [ ] **Step 1: Write the failing ordered hydration test**

Add a service test whose mocked executor returns a Flow draft with `meta.imageIds: [42, 41]`, then returns file rows in database order `[41, 42]`. Assert:

```js
assert.deepEqual(result.images.map((image) => image.id), [42, 41]);
assert.deepEqual(result.images[0], {
  id: 42,
  url: 'https://cdn.test/42/original',
  thumbnailUrl: 'https://cdn.test/42/small',
  mimeType: 'image/webp',
  sizeBytes: 4200,
  width: 420,
  height: 240,
});
```

Also assert the image query constrains `user_id`, `draft_id`, `file_type = 'image'`, and excludes `flow_post_media` rows.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test --test-name-pattern="getFlowDraft.*ordered image assets" test/service/draft.service.test.js
```

Expected: FAIL because `result.images` is undefined.

- [ ] **Step 3: Add empty and incomplete-binding tests**

Add one test asserting `meta.imageIds: []` returns `images: []` without an image query, and one asserting a missing requested row rejects with a `BusinessError` HTTP 409 rather than returning a partial array.

- [ ] **Step 4: Implement minimal server hydration**

Add focused helpers in `draft.service.js`:

```js
async function hydrateFlowDraftImages(executor, draft) {
  const imageIds = normalizeIdList(draft?.meta?.imageIds);
  if (imageIds.length === 0) return { ...draft, images: [] };

  const [rows] = await executor.execute(
    `
      SELECT f.id, f.filename, f.mimetype, f.size, im.width, im.height
      FROM file f
      INNER JOIN image_meta im ON im.file_id = f.id
      WHERE f.user_id = $1
        AND f.draft_id = $2
        AND f.id = ANY($3::bigint[])
        AND f.file_type = 'image'
        AND NOT EXISTS (
          SELECT 1 FROM flow_post_media fm WHERE fm.file_id = f.id
        );
    `,
    [draft.userId, draft.id, imageIds],
  );
  if (rows.length !== imageIds.length) {
    throw new BusinessError('Flow 草稿图片无法完整恢复', 409);
  }

  const rowsById = new Map(rows.map((row) => [Number(row.id), row]));
  const images = await Promise.all(
    imageIds.map(async (id) => {
      const row = rowsById.get(id);
      const [url, thumbnailUrl] = await Promise.all([
        mediaRuntime.resolveImageUrl(id, { variant: MEDIA_VARIANT.ORIGINAL }),
        mediaRuntime.resolveImageUrl(id, { variant: MEDIA_VARIANT.SMALL }),
      ]);
      return {
        id,
        url: url || buildPublicAssetUrl(baseURL, `/article/images/${row.filename}`),
        thumbnailUrl: thumbnailUrl || buildPublicAssetUrl(baseURL, `/article/images/${row.filename}?type=small`),
        mimeType: row.mimetype,
        sizeBytes: Number(row.size),
        width: Number(row.width),
        height: Number(row.height),
      };
    }),
  );
  return { ...draft, images };
}
```

Call it only for `DRAFT_TYPE.FLOW` after existing content hydration in both save and get paths. Resolve original and small URLs through `mediaRuntime` with the existing local fallback URL builder.

- [ ] **Step 5: Run focused server tests and verify GREEN**

Run:

```bash
node --test test/service/draft.service.test.js
```

Expected: all tests pass.

- [ ] **Step 6: Commit the server task**

```bash
git add src/service/draft.service.js test/service/draft.service.test.js
git commit -m "fix(flow): hydrate draft image assets"
```

---

### Task 2: Restore Uploaded Assets into the Client Queue

**Files:**
- Modify: `src/composables/test/useFlowImageUploads.test.ts`
- Modify: `src/components/tiptap-editor-flow/test/FlowAttachmentGrid.test.ts`
- Modify: `src/service/flow/flow.types.ts`
- Modify: `src/composables/useFlowImageUploads.ts`
- Modify: `src/components/tiptap-editor-flow/FlowAttachmentGrid.vue`

**Interfaces:**
- Consumes: `readonly FlowImageAsset[]` from the selected draft state.
- Produces: `restoreUploadedAssets(assets): boolean`, ordered uploaded attachments, ordered `uploadedMediaIds`, and ordered `uploadedAssets` without network upload calls.

- [ ] **Step 1: Write failing queue hydration tests**

Add tests that call the wished-for API:

```ts
const queue = useFlowImageUploads(adapters);
const restored = queue.restoreUploadedAssets([asset(42), asset(41)]);

expect(restored).toBe(true);
expect(queue.uploadedMediaIds.value).toEqual([42, 41]);
expect(queue.uploadedAssets.value.map((item) => item.id)).toEqual([42, 41]);
expect(queue.attachments.value.map((item) => item.file)).toEqual([null, null]);
expect(uploadImage).not.toHaveBeenCalled();
```

Move, delete, and dispose restored attachments. Assert deletion calls the adapter, while `revokeObjectUrl` is never called for their remote thumbnail URLs.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
pnpm exec vitest run src/composables/test/useFlowImageUploads.test.ts src/components/tiptap-editor-flow/test/FlowAttachmentGrid.test.ts
```

Expected: FAIL because `restoreUploadedAssets` does not exist and restored attachments cannot have `file: null`.

- [ ] **Step 3: Implement the minimal restored attachment model**

Change the attachment contract to:

```ts
export interface FlowImageAttachment {
  clientId: string;
  file: File | null;
  previewUrl: string;
  mimeType: 'image/webp' | null;
  sizeBytes: number | null;
  // existing status, progress, media and error fields remain
}
```

Create restored attachments with a stable client ID formatted as `restored:<mediaId>`, `status: 'uploaded'`, `progress: 100`, `file: null`, `previewUrl: asset.thumbnailUrl`, and the asset MIME/size fields. When a normal upload resolves, retain every `FlowImageAsset` field on the attachment. Derive `uploadedAssets` from uploaded attachments in the same order as `uploadedMediaIds`.

Guard `startUpload` so only attachments with a real `File` enter the upload adapter. In `revokePreview`, return immediately for `file === null`; add one short comment explaining that server URLs are not object URLs.

- [ ] **Step 4: Make the grid independent of `file.name`**

Use a decorative empty alt inside the already-labelled preview button:

```vue
<img class="flow-attachment-tile__image" :src="attachment.previewUrl" alt="" />
```

- [ ] **Step 5: Run queue/grid tests and verify GREEN**

Run the same Vitest command from Step 2. Expected: all focused tests pass.

- [ ] **Step 6: Commit the client queue task**

```bash
git add src/service/flow/flow.types.ts src/composables/useFlowImageUploads.ts src/composables/test/useFlowImageUploads.test.ts src/components/tiptap-editor-flow/FlowAttachmentGrid.vue src/components/tiptap-editor-flow/test/FlowAttachmentGrid.test.ts
git commit -m "fix(flow): restore uploaded attachment assets"
```

---

### Task 3: Persist and Select Restorable Draft Assets

**Files:**
- Modify: `src/service/flow/flow-draft.types.ts`
- Modify: `src/composables/test/useFlowDraftAutosave.test.ts`
- Modify: `src/composables/useFlowDraftAutosave.ts`

**Interfaces:**
- Consumes: remote `FlowDraftRecord.images` and locally supplied current uploaded assets.
- Produces: `initialize(): Promise<FlowDraftRestoreState | null>` where the state contains `content`, `meta`, `images`, and `imagesComplete`.

- [ ] **Step 1: Write failing schema-v2 and restore-selection tests**

Add a snapshot helper containing two assets and assert:

```ts
autosave.recordSnapshot(snapshot, [asset(42), asset(41)]);
const cached = JSON.parse(localStorage.getItem(key)!);
expect(cached.schemaVersion).toBe(2);
expect(cached.images.map((image) => image.id)).toEqual([42, 41]);
```

Cover remote-wins, local-v2-wins, and local-v1 fallback. For v1, assert matching remote assets are reordered to local `meta.imageIds`; if any ID is unavailable, assert `imagesComplete === false` and the IDs remain unchanged.

- [ ] **Step 2: Run autosave tests and verify RED**

Run:

```bash
pnpm exec vitest run src/composables/test/useFlowDraftAutosave.test.ts
```

Expected: FAIL because schema version is 1 and the API does not return image descriptors or completeness.

- [ ] **Step 3: Implement the minimal restorable state**

Define:

```ts
export interface FlowDraftRestoreState extends FlowDraftSnapshot {
  images: FlowImageAsset[];
  imagesComplete: boolean;
}
```

Keep server mutation payload construction explicit so local-only fields are not sent:

```ts
saveFlowDraftRequest({
  content: payload.snapshot.content,
  meta: payload.snapshot.meta,
  version: version.value,
});
```

Persist schema version 2 with normalized, ID-matched image assets. Parse version 1 without deleting it, then combine selected `meta.imageIds` with available remote assets. Never normalize a non-empty ID list to empty merely because descriptors are unavailable.

- [ ] **Step 4: Surface incomplete recovery without erasing local state**

Return `imagesComplete: false`, retain `meta.imageIds`, set an actionable recovery error, and do not schedule an automatic server write for that incomplete restored state.

- [ ] **Step 5: Run autosave tests and verify GREEN**

Run the command from Step 2. Expected: all autosave tests pass.

- [ ] **Step 6: Commit the autosave task**

```bash
git add src/service/flow/flow-draft.types.ts src/composables/useFlowDraftAutosave.ts src/composables/test/useFlowDraftAutosave.test.ts
git commit -m "fix(flow): persist restorable draft images"
```

---

### Task 4: Orchestrate Atomic Media and Document Restoration

**Files:**
- Modify: `src/views/flow/test/Flow.test.ts`
- Modify: `src/views/flow/cpns/test/FlowEditorModal.test.ts`
- Modify: `src/views/flow/Flow.vue`
- Modify: `src/views/flow/cpns/FlowEditorModal.vue`

**Interfaces:**
- Consumes: `FlowDraftRestoreState`, `restoreUploadedAssets`, and queue `uploadedAssets`.
- Produces: modal prop `restoredImages`, event `update:image-assets`, page-level `composerRestoring`, and publication blocking when `imagesComplete` is false.

- [ ] **Step 1: Write the failing full-refresh orchestration test**

Make `initialize()` resolve a document with `meta.imageIds: [42, 41]`, ordered image descriptors, and `imagesComplete: true`. Assert the modal receives those descriptors and restored IDs before document hydration can write:

```ts
expect(modal.props('restoredImages').map((image) => image.id)).toEqual([42, 41]);
modal.vm.$emit('update:json', restoredDocument);
expect(autosave.recordSnapshot).not.toHaveBeenCalledWith(
  expect.objectContaining({ meta: { imageIds: [], videoIds: [] } }),
  expect.anything(),
);
```

After the restore tick, emit a real edit and assert the saved metadata still contains `[42, 41]`.

- [ ] **Step 2: Write the failing modal hydration test**

Mount the modal with two restored assets. Assert the queue hydration action receives both assets once, the grid renders two uploaded attachments, and publish sends `[42, 41]` without uploading.

- [ ] **Step 3: Run page/modal tests and verify RED**

Run:

```bash
pnpm exec vitest run src/views/flow/test/Flow.test.ts src/views/flow/cpns/test/FlowEditorModal.test.ts src/views/flow/cpns/test/FlowEditorModalRealQueue.test.ts
```

Expected: FAIL because no restored-image prop or restore lock exists.

- [ ] **Step 4: Implement modal hydration**

Add `restoredImages?: readonly FlowImageAsset[]` and watch it with `immediate: true`, calling `uploads.restoreUploadedAssets(images)` only when the queue is not disposed. Watch `uploads.uploadedAssets`; emit `update:image-assets` before the existing `update:media-ids` event so the parent has descriptors before it records the ID snapshot. Keep media IDs derived from the queue so publish, move, and delete use one source of truth.

- [ ] **Step 5: Implement page restoration order and lock**

Add page state for restored images, completeness, and `composerRestoring`. Handle `update:image-assets` by replacing the descriptor state without scheduling a separate save; the immediately following media-ID event records one coherent snapshot. Ignore content/document/media events during the restore boundary. In `onMounted`, apply IDs and assets first, then the document, await `nextTick()`, and release the lock. Add one concise comment explaining that Tiptap emits JSON while applying restored content.

Include `composerRestoring` and incomplete-image state in publish/clear disabling. Pass current image descriptors into `recordSnapshot` so the local fallback stays recoverable.

- [ ] **Step 6: Run page/modal tests and verify GREEN**

Run the command from Step 3. Expected: all focused tests pass.

- [ ] **Step 7: Commit the orchestration task**

```bash
git add src/views/flow/Flow.vue src/views/flow/test/Flow.test.ts src/views/flow/cpns/FlowEditorModal.vue src/views/flow/cpns/test/FlowEditorModal.test.ts src/views/flow/cpns/test/FlowEditorModalRealQueue.test.ts
git commit -m "fix(flow): preserve draft images across refresh"
```

---

### Task 5: Verify the Complete Fix

**Files:**
- Verify only; no production changes unless a failing check reveals a scoped defect.

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: fresh evidence for focused behavior, type safety, build integrity, server regression safety, and PostgreSQL media behavior.

- [ ] **Step 1: Run the full Flow frontend suite**

```bash
pnpm exec vitest run src/composables/test/useFlowDraftAutosave.test.ts src/composables/test/useFlowImageUploads.test.ts src/components/tiptap-editor-flow/test src/views/flow/test src/views/flow/cpns/test
```

Expected: zero failed tests.

- [ ] **Step 2: Run client type-check and production build**

```bash
pnpm run type-check
pnpm run build-only
```

Expected: both commands exit 0.

- [ ] **Step 3: Run the complete server unit suite**

```bash
pnpm test
```

Run from `/Users/yangdanping/Desktop/personal_project/coderx_server`. Expected: zero failed tests.

- [ ] **Step 4: Run PostgreSQL media integration tests**

```bash
PGPASSWORD=123456 pnpm run test:media-db
```

Expected: zero failed integration tests; fixtures roll back their own writes.

- [ ] **Step 5: Inspect diffs and worktree ownership**

Run `git diff --check`, `git status --short`, and `git diff --stat` in both repositories. Confirm only scoped files and pre-existing user changes remain.

- [ ] **Step 6: Report manual acceptance still required**

State that automated verification covers the regression, while a fresh browser upload → wait for “已保存” → full refresh → publish pass remains the final human E2E check.
