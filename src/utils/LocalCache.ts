export const SEARCH_HISTORY_STORAGE_KEY = 'coderx_search_history_v2';
export const FAVORITE_SEARCH_HISTORY_STORAGE_KEY = 'coderx_favorite_search_history';

const LEGACY_SEARCH_HISTORY_STORAGE_KEY = 'coderx_search_history';
const SEARCH_HISTORY_LIMIT = 20;

export interface SearchHistoryItem {
  id: string;
  value: string;
  articleId?: string | number;
}

export type SearchHistoryInput = string | Pick<SearchHistoryItem, 'value' | 'articleId'>;

const toSearchHistoryItem = (input: SearchHistoryInput): SearchHistoryItem | null => {
  const value = (typeof input === 'string' ? input : input.value).trim();
  if (!value) return null;

  const articleId = typeof input === 'string' ? undefined : input.articleId;
  const hasArticleId =
    (typeof articleId === 'number' && Number.isFinite(articleId)) || (typeof articleId === 'string' && articleId.trim().length > 0);

  if (hasArticleId) {
    return {
      id: `article:${String(articleId).trim()}`,
      value,
      articleId,
    };
  }

  return {
    id: `query:${value.toLocaleLowerCase()}`,
    value,
  };
};

const parseSearchHistory = (rawValue: string | null): SearchHistoryItem[] | null => {
  if (rawValue === null) return null;

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    const seenIds = new Set<string>();
    return parsed
      .map((item): SearchHistoryItem | null => {
        if (!item || typeof item !== 'object' || !('value' in item)) return null;

        const candidate = item as { value?: unknown; articleId?: unknown };
        if (typeof candidate.value !== 'string') return null;
        if (candidate.articleId !== undefined && typeof candidate.articleId !== 'string' && typeof candidate.articleId !== 'number') {
          return null;
        }

        return toSearchHistoryItem({
          value: candidate.value,
          articleId: candidate.articleId,
        });
      })
      .filter((item): item is SearchHistoryItem => {
        if (!item || seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      })
      .slice(0, SEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
};

class LocalCache {
  /**
   * 进行本地数据缓存
   * @param key 设置键
   * @param value 设置值
   */
  static setCache(key: string, value: any) {
    // 传过来有可能是对象/数组...,所以用JSON.stringify统一转成字符串类型(序列化 obj --> string)在进行缓存
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * 获取本地缓存数据
   * @param key 要获取值对应的键
   */
  static getCache(key: string) {
    // 由于上面stringify了,所有这里拿到的一切value都是string类型的,这里用JSON.parse由JSON字符串转换为JSON对象(反序列化 string --> obj,因为已经stringify所以不怕转字符串报错)
    const value = window.localStorage.getItem(key);
    if (value) return JSON.parse(value);
  }

  /**
   * 删除本地缓存数据
   * @param key 要删除的值
   */
  static removeCache(key: string) {
    window.localStorage.removeItem(key);
  }

  static removeCachesByPrefix(prefix: string) {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter((key): key is string => !!key && key.startsWith(prefix));

    keys.forEach((key) => window.localStorage.removeItem(key));
  }

  /**
   * 清除所有本地数据缓存
   */
  static clearCache() {
    window.sessionStorage.clear();
    window.localStorage.clear();
  }

  private static readSearchHistory(key: string): SearchHistoryItem[] | null {
    return parseSearchHistory(window.localStorage.getItem(key));
  }

  private static writeSearchHistory(key: string, items: SearchHistoryItem[]) {
    const nextItems = items.slice(0, SEARCH_HISTORY_LIMIT);
    this.setCache(key, nextItems);
    return nextItems;
  }

  private static updateSearchHistory(key: string, currentItems: SearchHistoryItem[], input: SearchHistoryInput) {
    const item = toSearchHistoryItem(input);
    if (!item) return currentItems;

    return this.writeSearchHistory(key, [item, ...currentItems.filter((currentItem) => currentItem.id !== item.id)]);
  }

  private static migrateLegacySearchHistory() {
    const legacyRawValue = window.localStorage.getItem(LEGACY_SEARCH_HISTORY_STORAGE_KEY);
    if (legacyRawValue === null) return [];

    let legacyItems: SearchHistoryItem[] = [];
    try {
      const parsed: unknown = JSON.parse(legacyRawValue);
      if (Array.isArray(parsed)) {
        const seenIds = new Set<string>();
        legacyItems = parsed
          .map((item) => (typeof item === 'string' ? toSearchHistoryItem(item) : null))
          .filter((item): item is SearchHistoryItem => {
            if (!item || seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
          })
          .slice(0, SEARCH_HISTORY_LIMIT);
      }
    } catch {
      legacyItems = [];
    }

    this.writeSearchHistory(SEARCH_HISTORY_STORAGE_KEY, legacyItems);
    window.localStorage.removeItem(LEGACY_SEARCH_HISTORY_STORAGE_KEY);
    return legacyItems;
  }

  static addSearchHistory(input: SearchHistoryInput) {
    return this.updateSearchHistory(SEARCH_HISTORY_STORAGE_KEY, this.getSearchHistory(), input);
  }

  static getSearchHistory(): SearchHistoryItem[] {
    const storedItems = this.readSearchHistory(SEARCH_HISTORY_STORAGE_KEY);
    return storedItems ?? this.migrateLegacySearchHistory();
  }

  static removeSearchHistory(id: string) {
    const nextItems = this.getSearchHistory().filter((item) => item.id !== id);
    return this.writeSearchHistory(SEARCH_HISTORY_STORAGE_KEY, nextItems);
  }

  static clearSearchHistory() {
    this.removeCache(SEARCH_HISTORY_STORAGE_KEY);
    this.removeCache(LEGACY_SEARCH_HISTORY_STORAGE_KEY);
  }

  static getFavoriteSearchHistory(): SearchHistoryItem[] {
    return this.readSearchHistory(FAVORITE_SEARCH_HISTORY_STORAGE_KEY) ?? [];
  }

  static toggleFavoriteSearchHistory(input: SearchHistoryInput) {
    const item = toSearchHistoryItem(input);
    const currentItems = this.getFavoriteSearchHistory();
    if (!item) return currentItems;

    const isFavorite = currentItems.some((currentItem) => currentItem.id === item.id);
    if (isFavorite) {
      return this.writeSearchHistory(
        FAVORITE_SEARCH_HISTORY_STORAGE_KEY,
        currentItems.filter((currentItem) => currentItem.id !== item.id),
      );
    }

    return this.updateSearchHistory(FAVORITE_SEARCH_HISTORY_STORAGE_KEY, currentItems, item);
  }

  static isFavoriteSearchHistory(input: SearchHistoryInput) {
    const item = toSearchHistoryItem(input);
    return !!item && this.getFavoriteSearchHistory().some((currentItem) => currentItem.id === item.id);
  }
}

export default LocalCache; //new出来对象并导出去,这样外面就可以拿到对象去使用我们这里的属性/方法
