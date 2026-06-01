type MessagePart = {
  type?: string;
  text?: string;
};

export type AiSelectionContext = {
  id: string;
  text: string;
};

type MessageLike =
  | {
      parts?: MessagePart[] | null;
      metadata?: {
        selectionContexts?: unknown;
      } | null;
    }
  | null
  | undefined;

const isTextPart = (part: MessagePart): part is MessagePart & { type: 'text'; text: string } => {
  return part.type === 'text' && typeof part.text === 'string' && part.text.length > 0;
};

export const getAiAssistantMessageText = (message: MessageLike): string => {
  // console.log('getAiAssistantMessageText', toRaw(message));
  if (!Array.isArray(message?.parts)) return '';

  return message.parts
    .filter(isTextPart)
    .map((part) => part.text)
    .join('\n');
};

const getRawSelectionContextText = (item: unknown): string => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
    return item.text;
  }
  return '';
};

const getRawSelectionContextId = (item: unknown, index: number): string => {
  if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string' && item.id.trim()) {
    return item.id.trim();
  }
  return `selection-${index + 1}`;
};

export const normalizeSelectionContexts = (selectionContexts: unknown): AiSelectionContext[] => {
  if (!Array.isArray(selectionContexts)) return [];

  return selectionContexts
    .map((item, index) => ({
      id: getRawSelectionContextId(item, index),
      text: getRawSelectionContextText(item).trim(),
    }))
    .filter((item) => item.text.length > 0);
};

export const getAiAssistantSelectionContexts = (message: MessageLike): AiSelectionContext[] => {
  return normalizeSelectionContexts(message?.metadata?.selectionContexts);
};

export const getSelectionContextPreview = (text: string, maxLength = 10): string => {
  const normalizedText = text.trim();
  return normalizedText.length > maxLength ? `${normalizedText.slice(0, maxLength)}...` : normalizedText;
};

export const createAiChatStorageKey = ({ userId, scope }: { userId?: number | string; scope?: string }) => {
  const identity = userId ? `user-${userId}` : 'guest';
  const normalizedScope = (scope || 'global')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `coderx_ai_chat_${identity}_${normalizedScope || 'global'}`;
};
