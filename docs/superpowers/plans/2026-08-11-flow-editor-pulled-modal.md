# Flow Editor Pulled Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline Flow editor reveal with an accessible modal that descends with the existing cord, keeps the cord pulled while open, and closes only through the cord, `Esc`, or a subtle close icon.

**Architecture:** Add a focused `FlowEditorModal.vue` component that owns dialog rendering, keyboard/focus behavior, body scroll locking, and editor presentation. `Flow.vue` remains the state owner and keeps the Feed inert while open; `FlowCordWidget.vue` continues to toggle the same model while raising the pulled cord above the modal layer.

**Tech Stack:** Vue 3.5, TypeScript, `<script setup>`, scoped SCSS, Tiptap, Lucide Vue, Vitest, Vue Test Utils

## Global Constraints

- Keep `editorOpen` as the single source of truth for both cord and modal state.
- Keep cord click behavior unchanged except for removing the page scroll side effect: clicking only toggles the editor and preserves the current scroll position.
- Keep the cord pulled while the modal is open and retract it only when the modal closes.
- Use a 420ms synchronized pull/retract transition for cord and dialog.
- Render the Flow page behind a theme-aware inactive overlay; the dialog and cord stay above it.
- Do not close when the background overlay is clicked.
- Close through the cord, `Esc`, or the dialog close icon.
- Preserve editor content after closing and reopening.
- Respect `prefers-reduced-motion`.
- Preserve unrelated working-tree changes.

---

### Task 1: Accessible editor modal behavior

**Files:**
- Create: `src/views/flow/cpns/FlowEditorModal.vue`
- Create: `src/views/flow/cpns/test/FlowEditorModal.test.ts`

**Interfaces:**
- Consumes: `open: boolean`, `content: string`, and the existing `TiptapEditorFlow` editor.
- Produces: `close: []`, `update:content: [html: string]`, and `after-close: []` events.

- [ ] **Step 1: Write failing interaction tests**

Mount the modal with `open: true` and a stubbed `TiptapEditorFlow`. Assert that `.flow-editor-modal` is visible, the dialog has `role="dialog"` and `aria-modal="true"`, `Escape` emits `close`, `.flow-editor-modal__close` emits `close`, clicking `.flow-editor-modal` does not emit `close`, and toggling `open` off then on does not unmount the editor stub.

```ts
const wrapper = mount(FlowEditorModal, {
  attachTo: document.body,
  props: { open: true, content: '<p>draft</p>' },
  global: {
    stubs: {
      TiptapEditorFlow: defineComponent({
        template: '<div class="editor-stub" contenteditable="true">draft</div>',
      }),
      ElButton: { template: '<button><slot /></button>' },
    },
  },
});

expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true');
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
expect(wrapper.emitted('close')).toHaveLength(1);
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `pnpm vitest run src/views/flow/cpns/test/FlowEditorModal.test.ts`

Expected: FAIL because `FlowEditorModal.vue` does not exist.

- [ ] **Step 3: Implement the modal component**

Use a permanently mounted editor under `v-show` so the draft and Tiptap instance survive closing. Render a fixed overlay and dialog with a subtle `X` button, the existing editor, and the disabled publish button. Register one window `keydown` listener, handle `Escape` only while open, trap `Tab` within the dialog, lock body scrolling while open, focus the editable area after opening, restore body state on leave/unmount, and emit `after-close` from the transition hook.

```vue
<Transition name="flow-editor-modal" @after-leave="handleAfterLeave">
  <div v-show="open" class="flow-editor-modal">
    <section ref="dialogRef" class="flow-editor-modal__dialog" role="dialog" aria-modal="true" aria-label="发布 Flow" tabindex="-1">
      <button ref="closeButtonRef" type="button" class="flow-editor-modal__close" aria-label="关闭 Flow 编辑器" @click="emit('close')">
        <X :size="17" aria-hidden="true" />
      </button>
      <div class="flow-editor-modal__input">
        <TiptapEditorFlow :edit-content="content" @update:content="emit('update:content', $event)" />
        <div class="flow-editor-modal__publish"><el-button type="primary" plain disabled>发布</el-button></div>
      </div>
    </section>
  </div>
</Transition>
```

Style the overlay at `z-index: var(--z-modal)` with a theme-aware translucent background and light blur/saturation change. Place the dialog below the navbar with `width: min(var(--flow-column-width, 880px), calc(100vw - 32px))`, a solid glass surface, border, radius, and shadow. Animate dialog `translateY(calc(-100% - var(--navbarHeight)))` to `translateY(0)` over 420ms, fade the overlay, and disable transitions in reduced-motion mode.

- [ ] **Step 4: Run the modal tests**

Run: `pnpm vitest run src/views/flow/cpns/test/FlowEditorModal.test.ts`

Expected: all modal interaction tests PASS.

---

### Task 2: Keep the pulled cord in the foreground

**Files:**
- Modify: `src/views/flow/cpns/FlowCordWidget.vue`
- Modify: `src/views/flow/cpns/test/FlowCordWidget.contract.test.ts`

**Interfaces:**
- Consumes: the existing `v-model<boolean>` and `controlsId` prop.
- Produces: `focusHandle(): void` through `defineExpose`, plus an open-state foreground z-index.

- [ ] **Step 1: Extend the failing cord contract**

Assert that the handle has a template ref, the component exposes `focusHandle`, and `.flow-cord-outside` is raised above `--z-modal` only through the open-state class.

```ts
expect(source).toContain('ref="handleRef"');
expect(source).toMatch(/defineExpose\(\{[\s\S]*focusHandle/);
expect(source).toMatch(/\.flow-cord-widget\.is-editor-open[\s\S]*z-index:\s*calc\(var\(--z-modal\) \+ 2\)/);
```

- [ ] **Step 2: Run the cord contract and confirm failure**

Run: `pnpm vitest run src/views/flow/cpns/test/FlowCordWidget.contract.test.ts`

Expected: FAIL because the handle ref, exposed focus method, and modal foreground layer do not exist.

- [ ] **Step 3: Implement open-state layering and focus restoration support**

Bind `is-editor-open` on the widget root, add `ref="handleRef"` to the cord button, expose `focusHandle: () => handleRef.value?.focus()`, and move the cord transition to the same 420ms duration as the dialog. Keep the current closed `translateY(-40%)`, open `translateY(0)`, click toggle, route-leave delay, and scroll-to-top behavior.

- [ ] **Step 4: Run cord tests**

Run: `pnpm vitest run src/views/flow/cpns/test/FlowCordWidget.contract.test.ts`

Expected: PASS.

---

### Task 3: Wire the modal into Flow

**Files:**
- Modify: `src/views/flow/Flow.vue`
- Modify: `src/views/flow/test/flow-visual-contract.test.ts`

**Interfaces:**
- Consumes: `FlowEditorModal` events and `FlowCordWidget.focusHandle()`.
- Produces: one shared `editorOpen` state, retained `flowDraft`, and inert/hidden Feed content while the modal is open.

- [ ] **Step 1: Write failing Flow integration contracts**

Assert that `Flow.vue` imports and renders `FlowEditorModal`, passes `editorOpen` and `flowDraft`, handles `close` and `after-close`, marks `.flow-column` inert while open, removes `.flow-editor-reveal`, and no longer imports `TiptapEditorFlow` directly.

```ts
expect(flowSource).toContain("import FlowEditorModal from './cpns/FlowEditorModal.vue';");
expect(flowSource).toMatch(/<FlowEditorModal[\s\S]*:open="editorOpen"[\s\S]*:content="flowDraft"/);
expect(flowSource).toContain('@close="editorOpen = false"');
expect(flowSource).toContain('@after-close="restoreCordFocus"');
expect(flowSource).toContain(':inert="editorOpen"');
expect(flowSource).not.toContain('flow-editor-reveal');
expect(flowSource).not.toContain("@/components/tiptap-editor-flow/TiptapEditorFlow.vue");
```

- [ ] **Step 2: Run the Flow contract and confirm failure**

Run: `pnpm vitest run src/views/flow/test/flow-visual-contract.test.ts`

Expected: FAIL because Flow still renders the editor inline.

- [ ] **Step 3: Replace inline reveal with the modal**

Render `FlowCordWidget` and `FlowEditorModal` as Flow-level siblings. Keep the editor instance in the modal, pass draft updates to `flowDraft`, bind `.flow-column` inert and `aria-hidden` while open, and call the cord component's exposed `focusHandle()` after the modal finishes leaving. Remove the inline reveal markup and its grid animation styles without changing pull-to-refresh or Feed behavior.

- [ ] **Step 4: Run all focused Flow tests**

Run: `pnpm vitest run src/views/flow/test/flow-visual-contract.test.ts src/views/flow/cpns/test/FlowEditorModal.test.ts src/views/flow/cpns/test/FlowCordWidget.contract.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 5: Run static and production verification**

Run: `pnpm type-check && pnpm eslint src/views/flow/Flow.vue src/views/flow/cpns/FlowEditorModal.vue src/views/flow/cpns/FlowCordWidget.vue src/views/flow/test/flow-visual-contract.test.ts src/views/flow/cpns/test/FlowEditorModal.test.ts src/views/flow/cpns/test/FlowCordWidget.contract.test.ts && pnpm build-only`

Expected: every command exits with code 0.

- [ ] **Step 6: Perform visual verification**

At desktop and narrow widths, confirm that opening pulls the cord and dialog down together, the background changes tone without closing on click, the cord remains foreground and pulled, the close icon stays quiet until hover/focus, all three close paths retract synchronously, and the draft remains after reopen.

- [ ] **Step 7: Review the final diff**

Run: `git diff --check && git diff -- src/views/flow`

Expected: no whitespace errors and no unrelated files in the feature diff.
