import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('ArticleNav vertical typography contract', () => {
  it('keeps a fixed desktop nav width and truncates overflowing labels', () => {
    const navSource = readSource('src/views/article/cpns/ArticleNav.vue');
    const tagSource = readSource('src/views/article/cpns/SortableTagItem.vue');
    const articleSource = readSource('src/views/article/Article.vue');
    const tabItemSource = readSource('src/components/common/TabItem.vue');

    const navVertical = navSource.match(/&\.vertical \{[\s\S]*?&\.horizontal \{/)?.[0] ?? '';
    const tagVertical = tagSource.match(/&\.vertical \{[\s\S]*?&\.horizontal \{/)?.[0] ?? '';

    expect(tabItemSource).toContain('padding: 6px 20px');
    expect(navVertical).toContain('padding: 6px 14px');
    expect(tagVertical).toContain('padding: 6px 14px');
    expect(articleSource).toMatch(/\.article-nav \{[\s\S]*?width: calc\(5em \+ 28px\);/);
    expect(navVertical).toMatch(/^\s*width: 100%;/m);
    expect(tagVertical).toMatch(/^\s*width: 100%;/m);
    expect(navVertical).toContain('text-overflow: ellipsis');
    expect(tagVertical).toContain('text-overflow: ellipsis');
    expect(navVertical).toContain('text-align: left');
    expect(tagVertical).toContain('text-align: left');
    expect(navVertical).not.toMatch(/^\s*width: max-content;/m);
    expect(tagVertical).not.toMatch(/^\s*width: max-content;/m);
  });

  it('uses the original primary blue for the active overview label', () => {
    const navSource = readSource('src/views/article/cpns/ArticleNav.vue');
    const overviewActive = navSource.match(/&\.is-active \{[\s\S]*?background: rgba\(64, 158, 255, 0\.05\);[\s\S]*?\}/)?.[0] ?? '';

    expect(overviewActive).toContain('color: var(--el-color-primary)');
    expect(overviewActive).not.toContain('#81c995');
  });
});
