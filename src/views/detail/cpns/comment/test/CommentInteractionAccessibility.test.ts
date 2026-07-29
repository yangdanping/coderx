import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (file: string) =>
  readFileSync(join(process.cwd(), 'src/views/detail/cpns/comment', file), 'utf8');

describe('comment interaction accessibility contracts', () => {
  it('uses native buttons for comment actions and disclosure controls', () => {
    const commentAction = readSource('CommentAction.vue');
    const replyList = readSource('ReplyList.vue');

    expect(commentAction).toMatch(/<button[\s\S]*?class="action-item"/);
    expect(commentAction).toContain(':aria-pressed="isLiked"');
    expect(commentAction).toContain(':aria-expanded="isActiveReply"');
    expect(replyList).toContain('<button class="expand-btn"');
    expect(replyList).toContain('<button class="collapse-btn"');
  });

  it('uses a descriptive native link for navigating to the quoted reply', () => {
    const replyItem = readSource('ReplyItem.vue');
    const replyQuote = readSource('ReplyQuote.vue');

    expect(replyItem).toContain('<ReplyQuote');
    expect(replyQuote).toContain('<a');
    expect(replyQuote).toContain('class="quoted-jump"');
    expect(replyQuote).toContain(':href="targetReplyHref"');
    expect(replyQuote).toContain('定位原回复');
  });

  it('labels icon-only comment tools and keeps decorative icons hidden', () => {
    const commentTools = readSource('CommentTools.vue');

    expect(commentTools).toContain('aria-label="更多评论操作"');
    expect(commentTools).toContain('aria-hidden="true"');
  });

  it('centralizes the active trace and does not register one document listener per reply list', () => {
    const commentList = readSource('CommentList.vue');
    const replyList = readSource('ReplyList.vue');

    expect(commentList).toContain('@click="handleCommentListClick"');
    expect(replyList).toContain('commentStore.activeTrace');
    expect(replyList).not.toContain("document.addEventListener('click'");
  });

  it('observes reply layout changes instead of measuring only on focus changes', () => {
    const replyList = readSource('ReplyList.vue');

    expect(replyList).toContain('new ResizeObserver');
    expect(replyList).toContain('requestAnimationFrame');
    expect(replyList).toContain('resizeObserver.observe');
  });
});
