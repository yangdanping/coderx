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

  it('reuses the shared infinite scroll composable', () => {
    expect(flowFeedSource).toMatch(/useInfiniteScroll/);
    expect(flowFeedSource).not.toMatch(/new IntersectionObserver/);
  });

  it('reuses the list beam animation on navigable flow items', () => {
    expect(flowItemSource).toMatch(/&::after[\s\S]*linear-gradient\(90deg,\s*#43c3ff,\s*#afffe3\)/);
    expect(flowItemSource).toMatch(/&\.is-navigable:hover::after[\s\S]*scaleX\(1\)/);
  });
});
