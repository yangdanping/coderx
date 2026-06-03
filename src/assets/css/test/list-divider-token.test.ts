import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('list divider theme tokens', () => {
  it('defines one global list divider color for light and dark themes', () => {
    const commonScss = readSource('src/assets/css/common.scss');

    expect(commonScss).toMatch(/--border-color-list:\s*#eee;/);
    expect(commonScss).toMatch(/--border-shadow-list-bottom:\s*0 0\.5px 0 0 var\(--border-color-list\);/);
    expect(commonScss).toMatch(/html\.dark[\s\S]*--border-color-list:\s*rgba\(147,\s*161,\s*178,\s*0\.24\);/);
  });

  it('uses the list divider token in high-density list surfaces', () => {
    const targetFiles = [
      'src/components/list/ListItem.vue',
      'src/views/user/cpns/UserArticle.vue',
      'src/views/user/cpns/UserComment.vue',
      'src/views/user/cpns/UserFollowItem.vue',
      'src/views/user/cpns/UserHistory.vue',
      'src/views/user/cpns/UserCollect.vue',
      'src/views/detail/cpns/comment/CommentListItem.vue',
      'src/views/detail/cpns/comment/ReplyItem.vue',
    ];

    for (const path of targetFiles) {
      const source = readSource(path);
      expect(source, path).not.toMatch(/thin-border\((bottom|top),\s*#(?:eee|f0f0f0)\)/);
      expect(source, path).not.toMatch(/border-bottom:\s*1px solid #eee/);
      expect(source, path).toMatch(/var\(--border-color-list\)|var\(--border-shadow-list-bottom\)|thin-border\((bottom|top),\s*var\(--border-color-list\)\)/);
    }
  });
});
