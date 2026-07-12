import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readEditorSource = () => readFileSync(join(process.cwd(), 'src/components/tiptap-editor/TiptapEditor.vue'), 'utf8');

describe('Tiptap markdown typography contract', () => {
  it('uses the editor markdown font treatment for labels and source text', () => {
    const source = readEditorSource();

    expect(source).toContain('--markdown-editor-font');
    expect(source).toContain("font-family: var(--markdown-editor-font)");
    expect(source).toContain('letter-spacing: 0.18em');
    expect(source).toContain('text-transform: uppercase');
    expect(source).toContain('&:focus-visible');
    expect(source).not.toContain('transition: all 0.2s ease');
  });
});
