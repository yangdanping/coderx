import { describe, expect, it } from 'vitest';

import { createAiChatStorageKey, getAiAssistantSelectionContexts, getSelectionContextPreview, normalizeSelectionContexts } from './AiAssistant.message';

describe('AiAssistant message helpers', () => {
  it('normalizes selected contexts from message metadata', () => {
    const message = {
      metadata: {
        selectionContexts: [
          { id: 'a', text: '  这是一段用户划词内容  ' },
          { id: '', text: '第二段' },
          { id: 'empty', text: '   ' },
        ],
      },
    };

    expect(getAiAssistantSelectionContexts(message)).toEqual([
      { id: 'a', text: '这是一段用户划词内容' },
      { id: 'selection-2', text: '第二段' },
    ]);
  });

  it('clips selected context preview after ten characters', () => {
    expect(getSelectionContextPreview('1234567890')).toBe('1234567890');
    expect(getSelectionContextPreview('12345678901')).toBe('1234567890...');
  });

  it('uses user and scope to build a stable local chat cache key', () => {
    expect(createAiChatStorageKey({ userId: 7, scope: 'article:42' })).toBe('coderx_ai_chat_user-7_article-42');
    expect(createAiChatStorageKey({ scope: 'article:42' })).toBe('coderx_ai_chat_guest_article-42');
  });

  it('normalizes pending selected contexts without mutating caller data', () => {
    const contexts = [{ id: 'x', text: ' 上下文 ' }];

    expect(normalizeSelectionContexts(contexts)).toEqual([{ id: 'x', text: '上下文' }]);
    expect(contexts[0].text).toBe(' 上下文 ');
  });
});
