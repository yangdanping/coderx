import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('comment trace visual contract', () => {
  it('uses semantic light and dark comment trace tokens', () => {
    const commonStyles = readSource('src/assets/css/common.scss');
    const replyItem = readSource('src/views/detail/cpns/comment/ReplyItem.vue');

    expect(commonStyles.match(/--comment-reply-surface:/g)).toHaveLength(2);
    expect(commonStyles.match(/--comment-quote-surface:/g)).toHaveLength(2);
    expect(commonStyles.match(/--comment-trace-surface:/g)).toHaveLength(2);
    expect(commonStyles.match(/--comment-trace-border:/g)).toHaveLength(2);
    expect(replyItem).toContain('background-color: var(--comment-reply-surface)');
    expect(replyItem).not.toContain('background-image: var(--blockBg)');
  });

  it('uses a slow, subtle connector flow and disables it for reduced motion', () => {
    const commonStyles = readSource('src/assets/css/common.scss');
    const replyList = readSource('src/views/detail/cpns/comment/ReplyList.vue');
    const replyQuote = readSource('src/views/detail/cpns/comment/ReplyQuote.vue');

    expect(commonStyles.match(/--comment-trace-glow:/g)).toHaveLength(2);
    expect(replyList).toContain('@keyframes comment-trace-flow');
    expect(replyList).toContain('animation: comment-trace-flow 3s linear infinite');
    expect(replyList).not.toContain('flowing-light 1.5s');
    expect(replyList).toMatch(
      /@media \(max-width: 992px\)[\s\S]*\.connection-line::after[\s\S]*animation: none/,
    );
    expect(replyList).toContain('@media (prefers-reduced-motion: reduce)');
    expect(replyList).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.connection-line::after[\s\S]*animation: none/);
    expect(replyQuote).not.toContain('transition: max-height');
    expect(replyQuote).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps the thread rail subtle and gives source and target distinct states', () => {
    const replyList = readSource('src/views/detail/cpns/comment/ReplyList.vue');
    const replyItem = readSource('src/views/detail/cpns/comment/ReplyItem.vue');

    expect(replyList).toContain('border-inline-start: 1px solid var(--comment-thread-rail)');
    expect(replyList).toContain("'is-trace-source'");
    expect(replyList).toContain("'is-trace-target'");
    expect(replyItem).toContain('当前回复');
    expect(replyItem).toContain('原回复');
  });

  it('keeps desktop hover trace labels from changing the metadata row height', () => {
    const replyItem = readSource('src/views/detail/cpns/comment/ReplyItem.vue');

    expect(replyItem).toContain('span:not(.el-tag):not(.reply-to):not(.trace-role)');
    expect(replyItem).toMatch(
      /\.trace-role \{\n\s+display: inline-flex;\n\s+box-sizing: border-box;\n\s+height: 17PX;[\s\S]*padding: 0 5PX;[\s\S]*line-height: 1;/,
    );
    expect(replyItem).toMatch(
      /@media \(max-width: 992px\)[\s\S]*\.trace-role \{[\s\S]*height: 20PX;[\s\S]*padding: 1PX 6PX;[\s\S]*line-height: 1.4;/,
    );
  });

  it('keeps the mobile trace connector on the thread rail instead of the highlight edge', () => {
    const replyList = readSource('src/views/detail/cpns/comment/ReplyList.vue');

    expect(replyList).toMatch(
      /@media \(max-width: 992px\)[\s\S]*\.connection-line \{[\s\S]*&::before,[\s\S]*&::after \{\n\s+left: 8PX;/,
    );
    expect(replyList).not.toMatch(
      /@media \(max-width: 992px\)[\s\S]*\.connection-line \{[\s\S]*&::before,[\s\S]*&::after \{\n\s+left: 50%;/,
    );
  });
});
