import { acceptHMRUpdate, defineStore } from 'pinia';

const useLoadingStore = defineStore('loading', {
  /* 
    counters: { 
    'global': 2,           // 全局有2个请求正在进行
    'article.list': 1,     // 文章列表有1个请求
    'search': 0            // 搜索没有请求（会被删除）
  }
  */
  state: () => ({
    counters: {} as Record<string, number>,
    timers: {} as Record<string, NodeJS.Timeout>, // 超时定时器
  }),
  getters: {
    isLoading: (state) => {
      return (key = 'global') => (state.counters[key] ?? 0) > 0;
    },
    anyLoading: (state) => Object.values(state.counters).some((count) => count > 0),
  },
  actions: {
    // 🔧 清除单个定时器的辅助方法
    clearTimer(key: string) {
      if (this.timers[key]) {
        clearTimeout(this.timers[key]);
        delete this.timers[key];
      }
    },
    // 🔧 清除所有定时器的辅助方法
    clearAllTimers() {
      Object.values(this.timers).forEach((timer) => clearTimeout(timer));
      this.timers = {};
    },
    start(key = 'global', timeout = 30000) {
      const count = this.counters[key] ?? 0;
      this.counters[key] = count + 1;

      // 🛡️ 超时保护：防止网络错误导致 loading 永不消失
      if (!this.timers[key]) {
        this.timers[key] = setTimeout(() => {
          if (this.counters[key]) {
            console.warn(`⚠️ Loading key "${key}" timeout (${timeout}ms), force cleanup`);
            this.reset(key);
          }
        }, timeout);
      }
    },
    end(key = 'global') {
      const count = this.counters[key] ?? 0;
      if (count <= 1) {
        delete this.counters[key];
        this.clearTimer(key);
      } else {
        this.counters[key] = count - 1;
      }
    },
    reset(key?: string) {
      if (key) {
        delete this.counters[key];
        this.clearTimer(key);
      } else {
        this.counters = {};
        this.clearAllTimers();
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useLoadingStore, import.meta.hot));
}

export default useLoadingStore;
