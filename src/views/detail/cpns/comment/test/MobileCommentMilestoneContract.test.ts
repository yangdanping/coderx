import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('mobile comment milestone contracts', () => {
  it('reflows the detail view into one safe-area column with the article tools between content and comments', () => {
    const detailView = readSource('src/views/detail/Detail.vue');
    const detailLayout = readSource('src/assets/css/_detail-layout.scss');
    const detailPanel = readSource('src/views/detail/cpns/detail/DetailPanel.vue');

    expect(detailLayout).toContain('$detail-mobile-gutter: clamp(12px, 4vw, 16px)');
    expect(detailView).toContain('class="detail-main__article"');
    expect(detailView).toMatch(/<DetailContent[\s\S]*<DetailPanel[\s\S]*class="detail-main__comments"/);
    expect(detailView).toMatch(
      /@media \(max-width: \$detail-breakpoint-tablet\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)[\s\S]*column-gap: 0/,
    );
    expect(detailView).toMatch(
      /@media \(max-width: \$detail-breakpoint-tablet\)[\s\S]*padding-inline: \$detail-mobile-gutter/,
    );
    expect(detailPanel).toMatch(
      /@media \(max-width: \$detail-breakpoint-tablet\)[\s\S]*position: static[\s\S]*flex-direction: row/,
    );
  });

  it('preserves readable widths with compact avatars, one reply indent, and lightweight quotes', () => {
    const commentList = readSource('src/views/detail/cpns/comment/CommentList.vue');
    const commentItem = readSource('src/views/detail/cpns/comment/CommentListItem.vue');
    const replyItem = readSource('src/views/detail/cpns/comment/ReplyItem.vue');
    const replyList = readSource('src/views/detail/cpns/comment/ReplyList.vue');
    const replyQuote = readSource('src/views/detail/cpns/comment/ReplyQuote.vue');

    expect(commentList).toMatch(/@media \(max-width: 992px\)[\s\S]*padding-inline: 12PX/);
    expect(commentList).toMatch(/@media \(max-width: 992px\)[\s\S]*margin-bottom: 0/);
    expect(commentItem).toContain('<Avatar :info="item.author" :size="32"');
    expect(replyItem).toContain('<Avatar :info="item.author" :size="28"');
    expect(commentItem).toMatch(/\.comment-box[\s\S]*flex: 1[\s\S]*width: auto[\s\S]*min-width: 0/);
    expect(replyItem).toMatch(/\.reply-box[\s\S]*flex: 1[\s\S]*width: auto[\s\S]*min-width: 0/);
    expect(replyList).toMatch(/@media \(max-width: 992px\)[\s\S]*padding-inline-start: 10PX/);
    expect(replyQuote).toMatch(
      /@media \(max-width: 992px\)[\s\S]*\.quoted-wrapper[\s\S]*border: 0[\s\S]*background: transparent/,
    );
  });

  it('uses two-line metadata headers and keeps trace roles in the metadata flow', () => {
    const commentItem = readSource('src/views/detail/cpns/comment/CommentListItem.vue');
    const replyItem = readSource('src/views/detail/cpns/comment/ReplyItem.vue');
    const replyList = readSource('src/views/detail/cpns/comment/ReplyList.vue');
    const commentTools = readSource('src/views/detail/cpns/comment/CommentTools.vue');

    expect(commentItem).toContain('class="comment-meta-primary"');
    expect(commentItem).toContain('class="comment-meta-secondary"');
    expect(replyItem).toContain('class="reply-meta-primary"');
    expect(replyItem).toContain('class="reply-meta-secondary"');
    expect(replyItem).toContain('traceRole');
    expect(replyList).toContain(':trace-role="getReplyTraceRole(reply.id)"');
    expect(replyList).not.toMatch(/<span v-if="getReplyTraceRole\(reply.id\)" class="trace-role"/);
    expect(commentTools).toMatch(
      /@media \(max-width: 992px\)[\s\S]*\.comment-tools[\s\S]*position: static[\s\S]*width: 44PX/,
    );
  });

  it('provides 44px touch targets and responsive dialog, avatar, and heading semantics', () => {
    const comment = readSource('src/views/detail/cpns/comment/Comment.vue');
    const commentList = readSource('src/views/detail/cpns/comment/CommentList.vue');
    const commentItem = readSource('src/views/detail/cpns/comment/CommentListItem.vue');
    const commentAction = readSource('src/views/detail/cpns/comment/CommentAction.vue');
    const commentTools = readSource('src/views/detail/cpns/comment/CommentTools.vue');
    const replyItem = readSource('src/views/detail/cpns/comment/ReplyItem.vue');
    const replyList = readSource('src/views/detail/cpns/comment/ReplyList.vue');
    const replyQuote = readSource('src/views/detail/cpns/comment/ReplyQuote.vue');
    const avatar = readSource('src/components/avatar/Avatar.vue');

    expect(comment).toContain('<h2 class="comment-login-title">请先登录后评论</h2>');
    expect(commentList).toMatch(/\.sort-trigger[\s\S]*min-width: 44PX[\s\S]*min-height: 44PX/);
    expect(commentAction).toMatch(/\.action-item[\s\S]*min-width: 44PX[\s\S]*min-height: 44PX/);
    expect(commentTools).toContain('width="min(92vw, 640px)"');
    expect(commentTools).toMatch(/\.tools-trigger[\s\S]*width: 44PX[\s\S]*height: 44PX/);
    expect(replyList).toMatch(
      /\.expand-btn,[\s\S]*\.collapse-btn[\s\S]*min-height: 44PX/,
    );
    expect(replyList).toMatch(
      /\.connection-line \{\n\s+position: absolute;\n\s+width: 44PX/,
    );
    expect(replyQuote).toMatch(/\.quoted-jump[\s\S]*min-height: 44PX/);
    expect(replyQuote).toMatch(/\.toggle-text[\s\S]*min-height: 44PX/);
    expect(commentItem).toMatch(/@media \(max-width: 992px\)[\s\S]*font-size: 16PX/);
    expect(replyItem).toMatch(/@media \(max-width: 992px\)[\s\S]*font-size: 15PX/);
    expect(commentItem).toMatch(
      /\.user-info-box \{\n\s+min-height: 44PX;\n\s+justify-content: center;\n\s+padding-right: 44PX;\n\n\s+\.comment-meta-primary/,
    );
    expect(replyItem).toMatch(
      /\.user-info-box \{\n\s+min-height: 44PX;\n\s+padding-right: 44PX;\n\n\s+\.reply-meta-primary/,
    );
    expect(avatar).toContain('<RouterLink');
    expect(avatar).toContain(':alt="avatarAlt"');
    expect(avatar).toContain(':style="avatarSizeStyle"');
  });
});
