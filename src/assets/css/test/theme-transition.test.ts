import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => {
  const absolutePath = join(process.cwd(), path);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
};

const transitionScss = readSource('src/assets/css/theme-transition.scss');
const indexScss = readSource('src/assets/css/index.scss');

const tiptapSurfaceOwners = {
  '.tiptap-editor-container': 'src/components/tiptap-editor/TiptapEditor.vue',
  '.tiptap-toolbar': 'src/components/tiptap-editor/TiptapToolbar.vue',
  '.tiptap-bubble-menu': 'src/components/tiptap-editor/TiptapEditor.vue',
  '.comment-editor-container': 'src/components/tiptap-editor-comment/TiptapEditorComment.vue',
  '.comment-toolbar': 'src/components/tiptap-editor-comment/CommentToolbar.vue',
  '.comment-bubble-menu': 'src/components/tiptap-editor-comment/TiptapEditorComment.vue',
  '.flow-editor-container': 'src/components/tiptap-editor-flow/TiptapEditorFlow.vue',
  '.flow-bubble-menu': 'src/components/tiptap-editor-flow/TiptapEditorFlow.vue',
  '.completion-popover': 'src/components/tiptap-editor/extensions/AiCompletion/CompletionPopover.vue',
} as const;

describe('central theme transition policy', () => {
  it('imports one transient global transition policy', () => {
    expect(indexScss.match(/@use ['"]\.\/theme-transition['"];/g) ?? []).toHaveLength(1);
    expect(transitionScss).toMatch(/html\.theme-transitioning/);
    expect(transitionScss).toMatch(/html\.theme-transitioning\s+\*/);
    expect(transitionScss).toMatch(/\*::before/);
    expect(transitionScss).toMatch(/\*::after/);
  });

  it('consumes centralized motion tokens and limits interpolation to paint properties', () => {
    expect(transitionScss).toMatch(/transition-duration:\s*var\(--theme-transition-duration\)/);
    expect(transitionScss).toMatch(/transition-timing-function:\s*var\(--theme-transition-easing\)/);
    expect(transitionScss).toMatch(
      /transition-property:[\s\S]*color,[\s\S]*background-color,[\s\S]*border-color,[\s\S]*box-shadow,[\s\S]*fill,[\s\S]*stroke,[\s\S]*filter,[\s\S]*opacity/,
    );

    expect(transitionScss).not.toMatch(/transition:\s*all/);
    expect(transitionScss).not.toMatch(/transition-property:[\s\S]*\b(?:width|height|top|right|bottom|left|margin|padding|transform)\b/);
    expect(transitionScss).not.toMatch(/\b300ms\b/);
  });

  it('provides an immediate reduced-motion fallback', () => {
    expect(transitionScss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(transitionScss).toMatch(/@media[\s\S]*transition-duration:\s*0\.01ms/);
  });

  it('keeps every Tiptap theme surface in a centralized coverage registry', () => {
    for (const [selector, ownerPath] of Object.entries(tiptapSurfaceOwners)) {
      expect(transitionScss, selector).toContain(`'${selector}'`);
      expect(readSource(ownerPath), ownerPath).toContain(selector.slice(1));
    }
  });
});
