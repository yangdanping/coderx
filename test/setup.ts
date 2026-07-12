import { afterEach } from 'vitest';

const storageValues = new Map<string, string>();
const memoryLocalStorage: Storage = {
  get length() {
    return storageValues.size;
  },
  clear() {
    storageValues.clear();
  },
  getItem(key) {
    return storageValues.get(String(key)) ?? null;
  },
  key(index) {
    return Array.from(storageValues.keys())[index] ?? null;
  },
  removeItem(key) {
    storageValues.delete(String(key));
  },
  setItem(key, value) {
    storageValues.set(String(key), String(value));
  },
};

// Node 26 的实验性 Web Storage 在没有 --localstorage-file 时会暴露为 undefined，
// 并覆盖 jsdom 的实现。测试统一使用内存 Storage，避免结果依赖 Node 启动参数。
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: memoryLocalStorage,
});
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: memoryLocalStorage,
});

afterEach(() => {
  document.body.innerHTML = '';
});
