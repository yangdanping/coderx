import { beforeEach, describe, expect, it } from 'vitest';
import LocalCache, { FAVORITE_SEARCH_HISTORY_STORAGE_KEY, SEARCH_HISTORY_STORAGE_KEY } from '../LocalCache';

describe('LocalCache search history', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates legacy keyword strings into typed v2 history', () => {
    localStorage.setItem('coderx_search_history', JSON.stringify([' Vue ', 'TypeScript', 'vue']));

    expect(LocalCache.getSearchHistory()).toEqual([
      { id: 'query:vue', value: 'Vue' },
      { id: 'query:typescript', value: 'TypeScript' },
    ]);
    expect(localStorage.getItem('coderx_search_history')).toBeNull();
    expect(JSON.parse(localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY) ?? '[]')).toHaveLength(2);
  });

  it('keeps normal and favorite history isolated', () => {
    const article = { value: 'Vue Query', articleId: 21 };

    LocalCache.addSearchHistory(article);
    LocalCache.toggleFavoriteSearchHistory(article);
    LocalCache.removeSearchHistory('article:21');

    expect(LocalCache.getSearchHistory()).toEqual([]);
    expect(LocalCache.getFavoriteSearchHistory()).toEqual([{ id: 'article:21', value: 'Vue Query', articleId: 21 }]);
    expect(localStorage.getItem(FAVORITE_SEARCH_HISTORY_STORAGE_KEY)).not.toBeNull();
  });

  it('recovers from malformed or invalid stored values', () => {
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, '{broken');

    expect(LocalCache.getSearchHistory()).toEqual([]);

    localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify([
        null,
        { id: 'query:missing-value' },
        { id: 'query:valid', value: '  Valid  ' },
        { id: 'article:invalid', value: 'Invalid article', articleId: true },
      ]),
    );

    expect(LocalCache.getSearchHistory()).toEqual([{ id: 'query:valid', value: 'Valid' }]);
  });

  it('deduplicates by stable id and promotes the latest value', () => {
    LocalCache.addSearchHistory('Vue');
    LocalCache.addSearchHistory(' vue ');
    LocalCache.addSearchHistory({ value: 'Old title', articleId: 21 });
    LocalCache.addSearchHistory({ value: 'New title', articleId: 21 });

    expect(LocalCache.getSearchHistory()).toEqual([
      { id: 'article:21', value: 'New title', articleId: 21 },
      { id: 'query:vue', value: 'vue' },
    ]);
  });

  it('limits normal history to twenty items', () => {
    for (let index = 0; index < 22; index += 1) {
      LocalCache.addSearchHistory(`query ${index}`);
    }

    const history = LocalCache.getSearchHistory();
    expect(history).toHaveLength(20);
    expect(history[0]).toEqual({ id: 'query:query 21', value: 'query 21' });
    expect(history.at(-1)).toEqual({ id: 'query:query 2', value: 'query 2' });
  });

  it('toggles favorite state independently and supports clearing each list', () => {
    LocalCache.addSearchHistory('Vue');
    LocalCache.toggleFavoriteSearchHistory('Vue');

    expect(LocalCache.isFavoriteSearchHistory(' vue ')).toBe(true);

    LocalCache.clearSearchHistory();
    expect(LocalCache.getSearchHistory()).toEqual([]);
    expect(LocalCache.getFavoriteSearchHistory()).toHaveLength(1);

    LocalCache.toggleFavoriteSearchHistory('Vue');
    expect(LocalCache.isFavoriteSearchHistory('Vue')).toBe(false);
  });
});
