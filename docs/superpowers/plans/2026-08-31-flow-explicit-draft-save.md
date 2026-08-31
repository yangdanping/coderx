# Flow Explicit Draft Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Flow autosave with explicit draft saving, add a save button beside publish, and protect unsaved text/images with save-or-discard exit confirmation.

**Architecture:** Keep `Flow.vue` as the lifecycle orchestrator, convert `useFlowDraftAutosave` into an explicit persistence controller with a saved baseline, and keep `FlowEditorModal` request-free through typed props/events. Stage removal of images that belong to the saved baseline so discard can restore them; only persist or delete media after an explicit save/discard decision.

**Tech Stack:** Vue 3.5 Composition API with `<script setup lang="ts">`, TypeScript, Tiptap 3, TanStack Vue Query 5, Element Plus MessageBox, Vitest, Vue Test Utils, pnpm

## Global Constraints

- Change Flow only; article editor autosave behavior remains unchanged.
- Editing text or images must not write localStorage or call `PUT /flow/draft`.
- “保存草稿” is enabled only for meaningful text or at least one uploaded image when the current snapshot differs from the saved baseline.
- Close and Escape share one exit flow: unchanged state closes immediately; unsaved meaningful content offers “保存草稿”, “放弃”, and close/Escape as “取消”.
- Discarding edits to an existing saved draft restores its last saved text, image descriptors, and image order without deleting the remote draft.
- Publishing uses current content without requiring a prior draft save and retains existing draft cleanup semantics.
- Preserve restore-failure, incomplete-image, conflict, clearing, publishing, and lifecycle locks.
- Preserve unrelated dirty changes in `README.md`, `package.json`, `pnpm-lock.yaml`, and `.env.example`.

## File Structure

- `src/composables/useFlowImageUploads.ts`: add local-only detach and direct cleanup actions while keeping queue state private.
- `src/composables/test/useFlowImageUploads.test.ts`: prove staged saved-image removal and explicit cleanup behavior.
- `src/composables/useFlowDraftAutosave.ts`: replace scheduled autosave with current/saved snapshots and explicit `saveDraft()`.
- `src/composables/test/useFlowDraftAutosave.test.ts`: replace obsolete debounce expectations with explicit persistence and baseline tests while retaining restore/conflict/clear coverage.
- `src/views/flow/cpns/FlowEditorModal.vue`: render save next to publish, stage baseline-image removal, and expose scoped attachment cleanup.
- `src/views/flow/cpns/test/FlowEditorModal.test.ts`: verify button state/event and baseline-aware image removal.
- `src/views/flow/Flow.vue`: orchestrate explicit save, three-result close confirmation, baseline rollback, media cleanup, and close lifecycle.
- `src/views/flow/test/Flow.test.ts`: verify page-level save/close/discard behavior.
- `src/views/flow/test/FlowDraftRecovery.test.ts`: retain the recovery-failure no-write contract under explicit saving.

---

### Task 1: Stage saved-image removal without destroying rollback data

**Files:**
- Modify: `src/composables/useFlowImageUploads.ts`
- Modify: `src/composables/test/useFlowImageUploads.test.ts`

**Interfaces:**
- Consumes: existing `useFlowImageUploads(adapters)` queue and `deleteImage(mediaId)` adapter.
- Produces: `detach(clientId: string): boolean` and `deleteMediaIds(mediaIds: readonly number[]): Promise<{ failedDeletes: number }>`.

- [ ] **Step 1: Write failing queue tests for local detach and direct cleanup**

```ts
it('detaches a restored saved image locally without deleting it', () => {
  const adapters = queueAdapters({ deleteImage: vi.fn() });
  const queue = useFlowImageUploads(adapters);
  queue.restoreUploadedAssets([imageAsset(42)]);

  expect(queue.detach('restored:42')).toBe(true);
  expect(queue.uploadedMediaIds.value).toEqual([]);
  expect(adapters.deleteImage).not.toHaveBeenCalled();
});

it('cleans explicit media ids and reports partial failures', async () => {
  const deleteImage = vi.fn((id: number) => (id === 41 ? Promise.reject(new Error('failed')) : Promise.resolve()));
  const queue = useFlowImageUploads(queueAdapters({ deleteImage }));

  await expect(queue.deleteMediaIds([42, 41, 42])).resolves.toEqual({ failedDeletes: 1 });
  expect(deleteImage.mock.calls).toEqual([[42], [41]]);
});
```

- [ ] **Step 2: Run the focused queue tests and verify RED**

Run: `pnpm exec vitest run src/composables/test/useFlowImageUploads.test.ts`

Expected: FAIL because `detach` and `deleteMediaIds` do not exist.

- [ ] **Step 3: Add the minimal queue actions**

```ts
function detach(clientId: string): boolean {
  if (disposed) return false;
  const attachment = findAttachment(clientId);
  if (!attachment || attachment.status !== 'uploaded' || attachment.mediaId === null) return false;
  removeLocal(attachment);
  return true;
}

async function deleteMediaIds(mediaIds: readonly number[]): Promise<{ failedDeletes: number }> {
  const uniqueIds = Array.from(new Set(mediaIds.filter((id) => Number.isSafeInteger(id) && id > 0)));
  const results = await Promise.allSettled(uniqueIds.map((id) => deleteImage(id)));
  return { failedDeletes: results.filter((result) => result.status === 'rejected').length };
}
```

Expose both functions from the queue return value. Do not change existing `remove()` semantics for newly uploaded images.

- [ ] **Step 4: Re-run queue tests and verify GREEN**

Run: `pnpm exec vitest run src/composables/test/useFlowImageUploads.test.ts`

Expected: all queue and upload-policy tests pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/composables/useFlowImageUploads.ts src/composables/test/useFlowImageUploads.test.ts
git commit -m "feat(flow): stage saved image removal"
```

---

### Task 2: Convert Flow draft persistence to explicit save with a baseline

**Files:**
- Modify: `src/composables/useFlowDraftAutosave.ts`
- Modify: `src/composables/test/useFlowDraftAutosave.test.ts`

**Interfaces:**
- Consumes: `getFlowDraftRequest`, `saveFlowDraftRequest`, `deleteFlowDraftRequest`, `LocalCache`, and normalized Flow snapshots/assets.
- Produces:
  - `recordSnapshot(snapshot: FlowDraftSnapshot, images?: readonly FlowImageAsset[]): boolean`
  - `saveDraft(): Promise<FlowDraftRestoreState>`
  - `restoreSavedBaseline(): FlowDraftRestoreState | null`
  - readonly/computed `savedSnapshot`, `savedImages`, `savedMediaIds`, `hasContent`, `isDirty`, `canSave`, `isSaving`
  - existing `initialize()`, `clearDraft()`, and `resetAfterPublication()` contracts.

- [ ] **Step 1: Replace autosave expectations with failing explicit-save tests**

Retain the existing normalization, local-vs-remote restore, image recovery, conflict, clear, and publication-reset assertions. Delete the obsolete fake-timer cases that assert debounce/queued autosave, then add these cases:

```ts
it('keeps edits in memory until saveDraft is called', async () => {
  const autosave = mountAutosave({ userId: 7, canSync: true });
  await autosave.initialize();

  autosave.recordSnapshot(textSnapshot('只在内存'));
  await flushPromises();

  expect(autosave.hasContent.value).toBe(true);
  expect(autosave.isDirty.value).toBe(true);
  expect(autosave.canSave.value).toBe(true);
  expect(saveFlowDraftRequestMock).not.toHaveBeenCalled();
  expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).toBeNull();
});

it('persists only on explicit save and then advances the baseline', async () => {
  saveFlowDraftRequestMock.mockResolvedValue({ data: remoteDraft({ content: textSnapshot('显式保存').content, version: 5 }) });
  const autosave = mountAutosave({ userId: 7, canSync: true });
  await autosave.initialize();
  autosave.recordSnapshot(textSnapshot('显式保存'));

  await autosave.saveDraft();

  expect(saveFlowDraftRequestMock).toHaveBeenCalledOnce();
  expect(autosave.isDirty.value).toBe(false);
  expect(autosave.canSave.value).toBe(false);
  expect(autosave.restoreSavedBaseline()?.content).toEqual(textSnapshot('显式保存').content);
  expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).not.toBeNull();
});

it('treats image-only snapshots as saveable and whitespace-only snapshots as empty', async () => {
  const autosave = mountAutosave({ userId: null, canSync: false });
  await autosave.initialize();
  autosave.recordSnapshot(textSnapshot('   '));
  expect(autosave.hasContent.value).toBe(false);
  autosave.recordSnapshot({ ...emptySnapshot(), meta: { imageIds: [42], videoIds: [] } }, [imageAsset(42)]);
  expect(autosave.canSave.value).toBe(true);
});

it('does not advance the baseline when an authenticated save fails', async () => {
  saveFlowDraftRequestMock.mockRejectedValue(new Error('offline'));
  const autosave = mountAutosave({ userId: 7, canSync: true });
  await autosave.initialize();
  autosave.recordSnapshot(textSnapshot('失败内容'));

  await expect(autosave.saveDraft()).rejects.toThrow('offline');
  expect(autosave.isDirty.value).toBe(true);
  expect(autosave.status.value).toBe('error');
  expect(window.localStorage.getItem(getFlowDraftLocalStorageKey(7))).toBeNull();
});
```

- [ ] **Step 2: Run the composable tests and verify RED**

Run: `pnpm exec vitest run src/composables/test/useFlowDraftAutosave.test.ts`

Expected: FAIL because edits still schedule persistence and explicit baseline APIs are missing.

- [ ] **Step 3: Implement stable snapshot comparison and baseline state**

```ts
const savedSnapshot = shallowRef<FlowDraftSnapshot | null>(null);
const savedImages = shallowRef<FlowImageAsset[]>([]);
const latestSnapshot = shallowRef<FlowDraftSnapshot | null>(null);
const latestImages = shallowRef<FlowImageAsset[]>([]);

const snapshotKey = (snapshot: FlowDraftSnapshot | null) =>
  JSON.stringify(snapshot ? normalizeFlowDraftSnapshot(snapshot) : { content: createEmptyFlowDocument(), meta: { imageIds: [], videoIds: [] } });

const hasContent = computed(() => hasMeaningfulFlowDraft(latestSnapshot.value));
const isDirty = computed(() => snapshotKey(latestSnapshot.value) !== snapshotKey(savedSnapshot.value));
const canSave = computed(() => hasContent.value && isDirty.value && !isHydrating.value && !isClearing.value && !isSaving.value && status.value !== 'conflict');
```

`recordSnapshot()` must normalize and retain the current snapshot/assets, set `dirty` when different, and perform no storage or network write.

- [ ] **Step 4: Implement explicit save and baseline restore**

```ts
const saveDraft = async (): Promise<FlowDraftRestoreState> => {
  const snapshot = latestSnapshot.value;
  if (!snapshot || !hasMeaningfulFlowDraft(snapshot)) throw new Error('Flow 草稿没有可保存的内容');
  const selected = selectFlowDraftImages(snapshot.meta.imageIds, latestImages.value);
  if (!selected.imagesComplete) throw new Error(incompleteImagesMessage);
  status.value = 'saving';
  try {
    if (canSync) {
      const draft = (await saveFlowDraftRequest({ ...snapshot, version: version.value })).data;
      hydrateFromRemote(draft);
    }
    savedSnapshot.value = normalizeFlowDraftSnapshot(snapshot);
    savedImages.value = [...selected.images];
    persistLocalSnapshot(savedSnapshot.value, { images: savedImages.value });
    status.value = canSync ? 'saved' : 'local';
    return createRestoreState(savedSnapshot.value, savedImages.value);
  } catch (error) {
    status.value = getErrorStatus(error) === 409 ? 'conflict' : 'error';
    errorMessage.value = getErrorMessage(error) ?? '草稿保存失败';
    throw error;
  }
};
```

`restoreSavedBaseline()` returns a defensive copy of saved content/images, resets the in-memory current snapshot to that baseline, and restores status to `saved`, `local`, or `idle` without writing or deleting anything.

- [ ] **Step 5: Adapt initialization, clear, and publication reset**

- A remote winner becomes both current state and saved baseline.
- A newer authenticated local fallback is current state; the remote record is the saved baseline, so the local difference remains explicitly saveable.
- A guest local fallback is both current state and saved baseline.
- `clearDraft()` and `resetAfterPublication()` clear both current and baseline state.
- Remove the Flow scheduler and `flushPendingSave()` from this composable only; do not modify shared article autosave code.

- [ ] **Step 6: Re-run composable tests and verify GREEN**

Run: `pnpm exec vitest run src/composables/test/useFlowDraftAutosave.test.ts`

Expected: all explicit save, restore, conflict, clear, and publication reset tests pass with no fake-timer autosave traffic.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/composables/useFlowDraftAutosave.ts src/composables/test/useFlowDraftAutosave.test.ts
git commit -m "refactor(flow): make draft saving explicit"
```

---

### Task 3: Add the modal save action and baseline-aware attachment controls

**Files:**
- Modify: `src/views/flow/cpns/FlowEditorModal.vue`
- Modify: `src/views/flow/cpns/test/FlowEditorModal.test.ts`

**Interfaces:**
- Consumes props `canSaveDraft: boolean`, `savingDraft: boolean`, and `savedMediaIds: readonly number[]`.
- Emits `save-draft`.
- Produces exposed methods:
  - `discardAttachments(retainedMediaIds: readonly number[]): Promise<{ failedDeletes: number }>`
  - `cleanupMediaIds(mediaIds: readonly number[]): Promise<{ failedDeletes: number }>`
- Retains existing publish, update, clear, and close interfaces.

- [ ] **Step 1: Write failing modal tests**

```ts
it('renders save beside publish and enables it only when allowed', async () => {
  const wrapper = mountModal(true, { canSaveDraft: true });
  const actions = wrapper.get('.flow-editor-modal__publish');
  const buttons = actions.findAll('button');
  expect(buttons.map((button) => button.text())).toEqual(['保存草稿', '发布']);
  await buttons[0]!.trigger('click');
  expect(wrapper.emitted('save-draft')).toHaveLength(1);
});

it('detaches baseline images without deleting them immediately', async () => {
  const wrapper = mountModal(true, { restoredImages, savedMediaIds: [42, 41] });
  await nextTick();
  wrapper.findComponent({ name: 'FlowAttachmentGrid' }).vm.$emit('remove', 'restored:42');
  await nextTick();
  expect(queueHolder.current?.detach).toHaveBeenCalledWith('restored:42');
  expect(queueHolder.current?.remove).not.toHaveBeenCalledWith('restored:42');
});
```

Add the disabled/loading and exposed cleanup assertions in the same test file:

```ts
it('disables save while unavailable and shows saving progress', async () => {
  const disabled = mountModal(true, { canSaveDraft: false });
  expect(disabled.get('[data-testid="flow-save-draft"]').attributes('disabled')).toBeDefined();

  const saving = mountModal(true, { canSaveDraft: true, savingDraft: true });
  expect(saving.get('[data-testid="flow-save-draft"]').text()).toContain('保存中');
});

it('forwards explicit media cleanup results through the exposed API', async () => {
  const queue = queueHolder.current!;
  queue.deleteMediaIds.mockResolvedValue({ failedDeletes: 1 });
  const wrapper = mountModal();

  await expect((wrapper.vm as any).cleanupMediaIds([42, 41])).resolves.toEqual({ failedDeletes: 1 });
  expect(queue.deleteMediaIds).toHaveBeenCalledWith([42, 41]);
});
```

- [ ] **Step 2: Run modal tests and verify RED**

Run: `pnpm exec vitest run src/views/flow/cpns/test/FlowEditorModal.test.ts`

Expected: FAIL because the save props/event/button and queue actions are missing.

- [ ] **Step 3: Implement typed save props/event and action buttons**

```vue
<div class="flow-editor-modal__publish">
  <el-button plain :disabled="!canSave" :loading="savingDraft" @click="emit('save-draft')">
    {{ savingDraft ? '保存中…' : '保存草稿' }}
  </el-button>
  <el-button type="primary" plain :disabled="!canPublish" :loading="publishing" @click="publish">
    {{ publishing ? '发布中…' : '发布' }}
  </el-button>
</div>
```

The local `canSave` computed must combine the parent prop with queue upload/failure and lifecycle locks.

- [ ] **Step 4: Stage baseline image removal and expose cleanup**

```ts
async function removeAttachment(clientId: string): Promise<void> {
  const attachment = uploads.attachments.value.find((item) => item.clientId === clientId);
  if (attachment?.mediaId && props.savedMediaIds.includes(attachment.mediaId)) {
    if (uploads.detach(clientId)) abandonRetryIdentity();
    return;
  }
  if (await uploads.remove(clientId)) abandonRetryIdentity();
}

async function discardAttachments(retainedMediaIds: readonly number[]) {
  const retained = new Set(retainedMediaIds);
  const disposable = uploads.attachments.value.filter((item) => item.mediaId === null || !retained.has(item.mediaId));
  const results = await Promise.all(disposable.map((item) => uploads.remove(item.clientId)));
  uploads.dispose();
  return { failedDeletes: results.filter((removed) => !removed).length };
}
```

`cleanupMediaIds()` delegates to `uploads.deleteMediaIds()` after a successful draft save has unbound removed baseline files.

- [ ] **Step 5: Re-run modal tests and verify GREEN**

Run: `pnpm exec vitest run src/views/flow/cpns/test/FlowEditorModal.test.ts`

Expected: all modal accessibility, publish, upload queue, clear, save, and exposed-method tests pass.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/views/flow/cpns/FlowEditorModal.vue src/views/flow/cpns/test/FlowEditorModal.test.ts
git commit -m "feat(flow): add explicit draft save action"
```

---

### Task 4: Orchestrate save-or-discard exit behavior in the Flow page

**Files:**
- Modify: `src/views/flow/Flow.vue`
- Modify: `src/views/flow/test/Flow.test.ts`
- Modify: `src/views/flow/test/FlowDraftRecovery.test.ts`

**Interfaces:**
- Consumes composable `canSave`, `isDirty`, `hasContent`, `savedMediaIds`, `saveDraft()`, and `restoreSavedBaseline()`.
- Consumes modal `discardAttachments()` and `cleanupMediaIds()`.
- Produces page handlers `handleSaveFlowDraft({ closeAfterSave?: boolean })`, `handleEditorClose()`, and discard-reset handling in `handleAfterClose()`.

- [ ] **Step 1: Extend page mocks and write failing orchestration tests**

```ts
it('closes unchanged content without prompting', async () => {
  const autosave = autosaveHolder.current!;
  autosave.hasContent.value = true;
  autosave.isDirty.value = false;
  const { wrapper } = mountFlow();
  await flushPromises();
  wrapper.getComponent(ModalStub).vm.$emit('close');
  await flushPromises();
  expect(confirmMock).not.toHaveBeenCalled();
  expect(wrapper.getComponent(ModalStub).props('open')).toBe(false);
});

it('saves unsaved content from the exit prompt and closes only after success', async () => {
  autosaveHolder.current!.hasContent.value = true;
  autosaveHolder.current!.isDirty.value = true;
  confirmMock.mockResolvedValue('confirm');
  const { wrapper } = mountFlow();
  await flushPromises();
  wrapper.getComponent(ModalStub).vm.$emit('close');
  await flushPromises();
  expect(autosaveHolder.current!.saveDraft).toHaveBeenCalledOnce();
  expect(wrapper.getComponent(ModalStub).props('open')).toBe(false);
});

it('discards current changes while preserving and restoring the saved baseline', async () => {
  autosaveHolder.current!.hasContent.value = true;
  autosaveHolder.current!.isDirty.value = true;
  autosaveHolder.current!.savedMediaIds.value = [42, 41];
  autosaveHolder.current!.restoreSavedBaseline.mockReturnValue({
    content: textDocument,
    meta: { imageIds: [42, 41], videoIds: [] },
    images: restoredImages,
    imagesComplete: true,
  });
  confirmMock.mockRejectedValue('cancel');
  const { wrapper } = mountFlow();
  await flushPromises();
  wrapper.getComponent(ModalStub).vm.$emit('close');
  await flushPromises();
  expect(modalDiscardAttachmentsMock).toHaveBeenCalledWith([42, 41]);
  expect(autosaveHolder.current!.clearDraft).not.toHaveBeenCalled();
});
```

Add these focused edge cases:

```ts
it('keeps editing when the exit prompt is closed', async () => {
  autosaveHolder.current!.hasContent.value = true;
  autosaveHolder.current!.isDirty.value = true;
  confirmMock.mockRejectedValue('close');
  const { wrapper } = mountFlow();
  await flushPromises();
  wrapper.getComponent(ModalStub).vm.$emit('close');
  await flushPromises();
  expect(wrapper.getComponent(ModalStub).props('open')).toBe(true);
});

it('keeps the modal open when exit-triggered saving fails', async () => {
  autosaveHolder.current!.hasContent.value = true;
  autosaveHolder.current!.isDirty.value = true;
  autosaveHolder.current!.saveDraft.mockRejectedValue(new Error('offline'));
  confirmMock.mockResolvedValue('confirm');
  const { wrapper } = mountFlow();
  await flushPromises();
  wrapper.getComponent(ModalStub).vm.$emit('close');
  await flushPromises();
  expect(wrapper.getComponent(ModalStub).props('open')).toBe(true);
});

it('saves from the footer without closing', async () => {
  const { wrapper } = mountFlow();
  await flushPromises();
  wrapper.getComponent(ModalStub).vm.$emit('save-draft');
  await flushPromises();
  expect(autosaveHolder.current!.saveDraft).toHaveBeenCalledOnce();
  expect(wrapper.getComponent(ModalStub).props('open')).toBe(true);
});

it('resets new unsaved content to empty after discard closes', async () => {
  autosaveHolder.current!.hasContent.value = true;
  autosaveHolder.current!.isDirty.value = true;
  autosaveHolder.current!.savedMediaIds.value = [];
  autosaveHolder.current!.restoreSavedBaseline.mockReturnValue(null);
  confirmMock.mockRejectedValue('cancel');
  const { wrapper } = mountFlow();
  await flushPromises();
  wrapper.getComponent(ModalStub).vm.$emit('close');
  await flushPromises();
  wrapper.getComponent(ModalStub).vm.$emit('after-close');
  await flushPromises();
  expect(wrapper.getComponent(ModalStub).props('document')).toEqual(emptyDocument);
});
```

For removed saved media cleanup, set `modalCleanupMediaIdsMock` to `{ failedDeletes: 1 }`, save a snapshot whose IDs omit one baseline ID, and assert `msgWarnMock` receives the deferred-cleanup warning.

- [ ] **Step 2: Run page tests and verify RED**

Run: `pnpm exec vitest run src/views/flow/test/Flow.test.ts src/views/flow/test/FlowDraftRecovery.test.ts`

Expected: FAIL because current close always hides the editor and page does not expose explicit save props/events.

- [ ] **Step 3: Wire save state and direct saving**

Pass these modal bindings:

```vue
:can-save-draft="flowDraftAutosave.canSave.value"
:saving-draft="flowDraftAutosave.isSaving.value"
:saved-media-ids="flowDraftAutosave.savedMediaIds.value"
@save-draft="handleSaveFlowDraft()"
```

On successful save, compute `removedSavedIds` from the pre-save baseline, call `cleanupMediaIds(removedSavedIds)`, and warn if cleanup is deferred. Save failure preserves the current editor state and reports `flowDraftAutosave.errorMessage.value`.

- [ ] **Step 4: Implement the three-result close confirmation**

```ts
async function handleEditorClose() {
  if (closeLocked.value || closeConfirming.value) return;
  if (!flowDraftAutosave.hasContent.value || !flowDraftAutosave.isDirty.value) {
    editorOpen.value = false;
    return;
  }
  closeConfirming.value = true;
  try {
    await ElMessageBox.confirm('当前 Flow 有尚未保存的内容。', '退出 Flow 编辑？', {
      confirmButtonText: '保存草稿',
      cancelButtonText: '放弃',
      distinguishCancelAndClose: true,
      closeOnClickModal: false,
      autofocus: false,
      type: 'warning',
    });
    await handleSaveFlowDraft({ closeAfterSave: true });
  } catch (action) {
    if (action === 'cancel') await discardFlowChanges();
  } finally {
    closeConfirming.value = false;
  }
}
```

`action === 'close'` means cancel and continues editing.

- [ ] **Step 5: Apply baseline rollback after the close transition**

Before closing on discard, call `discardAttachments(savedMediaIds)` and set a discard-reset flag. In `handleAfterClose()`, call `restoreSavedBaseline()`, apply its document/media/image descriptors or the empty document, increment `composerGeneration`, clear the flag, and restore cord focus. Never call `clearDraft()` for this path.

- [ ] **Step 6: Preserve recovery and publication behavior**

- Keep `draftRecoveryBlocked` checks before save/publish/clear.
- Keep publication reset higher priority than normal/discard close reset.
- Ensure no `recordSnapshot()` call can trigger network or local persistence.
- Keep incomplete restored media IDs stable until explicitly replaced or discarded.

- [ ] **Step 7: Run page and all Flow-focused tests**

Run:

```bash
pnpm exec vitest run \
  src/composables/test/useFlowImageUploads.test.ts \
  src/composables/test/useFlowDraftAutosave.test.ts \
  src/views/flow/cpns/test/FlowEditorModal.test.ts \
  src/views/flow/test/Flow.test.ts \
  src/views/flow/test/FlowDraftRecovery.test.ts \
  src/views/flow/test/flow-visual-contract.test.ts
```

Expected: all targeted tests pass.

- [ ] **Step 8: Commit Task 4**

```bash
git add src/views/flow/Flow.vue src/views/flow/test/Flow.test.ts src/views/flow/test/FlowDraftRecovery.test.ts
git commit -m "feat(flow): confirm unsaved changes on exit"
```

---

### Task 5: Verify the complete client change

**Files:**
- Verify only; fix only regressions caused by Tasks 1–4.

**Interfaces:**
- Consumes the completed Flow explicit-save implementation.
- Produces evidence that focused behavior, static typing, lint, full tests, and production build remain healthy.

- [ ] **Step 1: Run static checks**

Run: `pnpm run type-check`

Expected: exit 0 with no Vue/TypeScript errors.

Run: `pnpm run lint`

Expected: exit 0 with no new lint errors.

- [ ] **Step 2: Run the full test suite**

Run: `pnpm exec vitest run`

Expected: all tests pass.

- [ ] **Step 3: Run the production build**

Run: `pnpm run build`

Expected: type-check and Vite build complete successfully.

- [ ] **Step 4: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
git log --oneline -5
```

Expected: no whitespace errors; only intended Flow source/tests plus the user's pre-existing dirty files remain.

If verification exposes a regression caused by Tasks 1–4, return to the task that owns that file, add a failing regression test, fix it, rerun that task's focused tests, and commit the exact source/test pair with `fix(flow): resolve explicit draft save regression`. If verification is clean, create no extra commit.
