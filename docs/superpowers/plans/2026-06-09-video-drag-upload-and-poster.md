# Video Drag Upload And Poster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ordered image/video drag uploads with a clear drop overlay and preserve generated video posters across upload, polling, and article reloads.

**Architecture:** Reuse the existing Tiptap image/video upload commands and add an awaitable storage contract to video uploads so the editor can serialize mixed media. Keep FFmpeg generation unchanged; normalize the video status response to a public poster URL and feed article poster metadata back into the editor registry.

**Tech Stack:** Vue 3, TypeScript, Tiptap 3, Vitest, SCSS, Koa, Node test runner, PostgreSQL.

---

### Task 1: Make Video Upload Awaitable And Callback-Aware

**Files:**
- Modify: `src/components/tiptap-editor/types/video-upload.type.ts`
- Modify: `src/components/tiptap-editor/types/index.ts`
- Modify: `src/components/tiptap-editor/extensions/VideoUpload.ts`
- Test: `src/components/tiptap-editor/extensions/test/VideoUpload.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests proving:

```ts
expect(storage.getUploadPromise(file)).toBe(uploadPromise);
expect(onUploaded).toHaveBeenCalledWith({ id, url, poster });
expect(chain.insertContent).not.toHaveBeenCalled();
```

- [ ] **Step 2: Verify the tests fail**

Run:

```bash
pnpm exec vitest run src/components/tiptap-editor/extensions/test/VideoUpload.test.ts
```

Expected: failures because video upload has no storage Promise or success callback.

- [ ] **Step 3: Implement the minimal contract**

Add `UploadedVideoPayload`, `onUploaded`, a per-file Promise map, and `addStorage().getUploadPromise(file)`. Resolve the tracked Promise after upload and node/token insertion, while leaving transcode polling detached.

- [ ] **Step 4: Verify the focused tests pass**

Run the same Vitest command and expect all tests in the file to pass.

### Task 2: Add Ordered Mixed-Media Drop Handling And Overlay

**Files:**
- Modify: `src/components/tiptap-editor/TiptapEditor.vue`
- Modify: `src/components/tiptap-editor/TiptapToolbar.vue`
- Modify: `src/components/tiptap-editor/types/markdown-split-preview.type.ts`
- Modify: `src/components/tiptap-editor/types/index.ts`
- Test: `src/components/tiptap-editor/test/TiptapEditor.test.ts`
- Test: `src/components/tiptap-editor/test/TiptapToolbar.test.ts`

- [ ] **Step 1: Write failing component tests**

Cover:

```ts
// dropped video uses resolved rich-text position
expect(uploadVideo).toHaveBeenCalledWith(video, { insertSelection: { from: 17, to: 17 } });

// mixed files do not start the next upload until the previous Promise resolves
expect(callOrder).toEqual(['image', 'video']);

// unsupported files are skipped with one warning
expect(showWarn).toHaveBeenCalledTimes(1);

// external file drag shows explicit overlay copy
expect(wrapper.get('[data-testid="media-drop-overlay"]').text())
  .toContain('释放以上传图片或视频');
```

Also cover split-preview callbacks inserting image HTML/video tokens at the Markdown selection.

- [ ] **Step 2: Verify component tests fail**

Run:

```bash
pnpm exec vitest run src/components/tiptap-editor/test/TiptapEditor.test.ts src/components/tiptap-editor/test/TiptapToolbar.test.ts
```

Expected: failures for video drops, mixed ordering, overlay, and split video callback.

- [ ] **Step 3: Implement the minimal editor changes**

Use one relative editor body and one `pointer-events: none` overlay. Process `DataTransfer.files` in original order, await the matching extension storage Promise, and advance the insertion selection after each item. In split preview, snapshot the Markdown selection and insert image HTML or `[[video:id]]`.

- [ ] **Step 4: Verify focused component tests pass**

Run the same Vitest command and expect all focused tests to pass.

### Task 3: Preserve Poster Metadata When Reloading Articles

**Files:**
- Modify: `src/stores/types/article.result.ts`
- Modify: `src/components/tiptap-editor/TiptapEditor.vue`
- Test: `src/components/tiptap-editor/test/TiptapEditor.test.ts`

- [ ] **Step 1: Strengthen the existing article hydration test**

Provide `poster: 'http://example.com/existing-poster.jpg'` in `editData.videos` and assert both the registry call and preview `<video poster>` use it.

- [ ] **Step 2: Verify the test fails**

Run:

```bash
pnpm exec vitest run src/components/tiptap-editor/test/TiptapEditor.test.ts
```

Expected: the preview has no `poster` because article hydration currently writes `null`.

- [ ] **Step 3: Implement poster hydration**

Add `poster?: string | null` to `IArticleVideo` and register `video.poster ?? null`.

- [ ] **Step 4: Verify the focused test passes**

Run the same Vitest command and expect it to pass.

### Task 4: Return A Public Poster URL From Video Status

**Files:**
- Modify: `../coderx_server/src/controller/video.controller.js`
- Test: `../coderx_server/test/controller/video.controller.test.js`

- [ ] **Step 1: Write failing controller tests**

Mock `getVideoById` with a poster filename and assert:

```js
assert.equal(ctx.body.data.poster, `${baseURL}/article/video/demo-poster.jpg`);
```

Add a second case asserting `poster` remains `null`.

- [ ] **Step 2: Verify backend tests fail**

Run:

```bash
pnpm test -- test/controller/video.controller.test.js
```

Expected: returned poster is still the database filename.

- [ ] **Step 3: Implement response normalization**

Clone the service result in `getVideoInfo` and convert only non-empty poster filenames to the public article video URL.

- [ ] **Step 4: Verify controller tests pass**

Run:

```bash
node --test test/controller/video.controller.test.js
```

Expected: all controller tests pass.

### Task 5: Full Verification

**Files:**
- Verify all modified frontend and backend files.

- [ ] **Step 1: Run frontend tests**

```bash
pnpm exec vitest run
```

- [ ] **Step 2: Run frontend static verification**

```bash
pnpm type-check
pnpm lint
pnpm build
```

- [ ] **Step 3: Run backend tests**

```bash
pnpm test
```

- [ ] **Step 4: Inspect database and generated assets**

Confirm completed video rows still have poster filenames and corresponding files exist.

- [ ] **Step 5: Browser verification**

Use the local app and existing browser session to verify overlay visibility, video drop, mixed order, generated poster, and article reload. If authentication prevents a real upload, report the exact remaining manual scenario instead of claiming it was tested.
