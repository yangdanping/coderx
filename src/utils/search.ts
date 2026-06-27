import { formatShortcut, MacKeySymbols, isMacOS } from './keyboard';

export const normalizeSearchKeyword = (keyword?: string) => (keyword ?? '').trim().toLocaleLowerCase();

export const searchShortcut = {
  windows: 'Ctrl\u00a0K',
  mac: `${MacKeySymbols.Command}\u00a0K`,
} as const;

export const getSearchShortcutText = () => formatShortcut(searchShortcut);

export const isSearchToggleShortcut = (event: KeyboardEvent) => {
  const isModifierPressed = isMacOS() ? event.metaKey : event.ctrlKey;
  return isModifierPressed && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k';
};

export interface HighlightPart {
  text: string;
  matched: boolean;
}

export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getHighlightedSearchParts = (text: string, keyword: string): HighlightPart[] => {
  const normalizedKeyword = keyword.trim();
  if (!text || !normalizedKeyword) return [{ text, matched: false }];

  const regex = new RegExp(escapeRegExp(normalizedKeyword), 'gi');
  const parts: HighlightPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(regex)) {
    const matchText = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > cursor) {
      parts.push({ text: text.slice(cursor, matchIndex), matched: false });
    }

    parts.push({ text: matchText, matched: true });
    cursor = matchIndex + matchText.length;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), matched: false });
  }

  return parts.length ? parts : [{ text, matched: false }];
};
