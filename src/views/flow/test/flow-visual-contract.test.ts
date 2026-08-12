import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const flowSource = fs.readFileSync(path.resolve(process.cwd(), 'src/views/flow/Flow.vue'), 'utf8');
const flowFeedSource = fs.readFileSync(path.resolve(process.cwd(), 'src/views/flow/cpns/FlowFeed.vue'), 'utf8');
const flowItemSource = fs.readFileSync(path.resolve(process.cwd(), 'src/views/flow/cpns/FlowFeedItem.vue'), 'utf8');
const gallerySource = fs.readFileSync(path.resolve(process.cwd(), 'src/views/flow/cpns/FlowMediaGallery.vue'), 'utf8');
const editorSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/tiptap-editor-flow/TiptapEditorFlow.vue'), 'utf8');

describe('Flow visual contract', () => {
  it('masks only the Flow background layer', () => {
    expect(flowSource).toMatch(/\.flow-column[\s\S]*&::before[\s\S]*mask-image:/);
    expect(flowSource).toMatch(/\.flow-column[\s\S]*&::before[\s\S]*backdrop-filter:/);
  });

  it('keeps gallery images static and navigation arrows minimal', () => {
    expect(gallerySource).not.toMatch(/img[\s\S]*&:hover[\s\S]*transform:\s*scale/);
    expect(gallerySource).toMatch(/\.nav-btn[\s\S]*background:\s*transparent/);
    expect(gallerySource).toMatch(/\.nav-btn[\s\S]*color:\s*var\(--text-primary\)/);
  });

  it('uses neutral theme colors for the Flow editor toolbar', () => {
    expect(editorSource).toMatch(/:deep\(\.comment-toolbar\)[\s\S]*background:/);
    expect(editorSource).toMatch(/:deep\(\.comment-toolbar[\s\S]*--el-button-text-color:\s*var\(--text-primary/);
  });

  it('renders the Flow editor as a retained pulled modal instead of an inline reveal', () => {
    expect(flowSource).toContain("import FlowEditorModal from './cpns/FlowEditorModal.vue';");
    expect(flowSource).toMatch(/<FlowEditorModal[\s\S]*:open="editorOpen"[\s\S]*:content="flowDraft"/);
    expect(flowSource).toContain(':document="flowDraftDocument"');
    expect(flowSource).toContain(':draft-status="flowDraftAutosave.status.value"');
    expect(flowSource).toContain(':editor-disabled="composerClearing || flowDraftAutosave.isClearing.value"');
    expect(flowSource).toContain('@update:json="handleFlowDocumentUpdate"');
    expect(flowSource).toContain('@clear-draft="handleClearFlowDraft"');
    expect(flowSource).toContain('@close="handleEditorClose"');
    expect(flowSource).toMatch(/function handleEditorClose\(\)[\s\S]*modalPublishing\.value[\s\S]*publicationResetPending[\s\S]*editorOpen\.value = false/);
    expect(flowSource).toContain('@after-close="handleAfterClose"');
    expect(flowSource).toMatch(/function handleAfterClose\(\)[\s\S]*restoreCordFocus\(\)/);
    expect(flowSource).toContain(':inert="editorOpen"');
    expect(flowSource).not.toContain('flow-editor-reveal');
    expect(flowSource).not.toContain('@/components/tiptap-editor-flow/TiptapEditorFlow.vue');
  });

  it('keeps Flow text structured for server drafts while retaining HTML output', () => {
    expect(editorSource).toContain('editDocument?: TiptapDocContent');
    expect(editorSource).toMatch(/const document = normalizeFlowDocument\(editorInstance\.getJSON\(\)\)/);
    expect(editorSource).toMatch(/emit\('update:document',\s*document\)/);
    expect(editorSource).toMatch(/emit\('update:json',\s*document\)/);
    expect(editorSource).toMatch(/emit\('update:content',\s*editorInstance\.getHTML\(\)/);
  });

  it('reuses the shared infinite scroll composable', () => {
    expect(flowFeedSource).toMatch(/useInfiniteScroll/);
    expect(flowFeedSource).not.toMatch(/new IntersectionObserver/);
  });

  it('reuses the list beam animation on navigable flow items', () => {
    expect(flowItemSource).toMatch(/&::after[\s\S]*linear-gradient\(90deg,\s*#43c3ff,\s*#afffe3\)/);
    expect(flowItemSource).toMatch(/&\.is-navigable:hover::after[\s\S]*scaleX\(1\)/);
  });
});
