import { defineStore } from 'pinia';

const useLoadingStore = defineStore('loading', {
  state: () => ({
    counters: {} as Record<string, number>,
  }),
  getters: {
    isLoading: (state) => {
      return (key = 'global') => (state.counters[key] ?? 0) > 0;
    },
    anyLoading: (state) => Object.values(state.counters).some((count) => count > 0),
  },
  actions: {
    start(key = 'global') {
      const count = this.counters[key] ?? 0;
      this.counters[key] = count + 1;
    },
    end(key = 'global') {
      const count = this.counters[key] ?? 0;
      if (count <= 1) delete this.counters[key];
      else this.counters[key] = count - 1;
    },
    reset(key?: string) {
      if (key) delete this.counters[key];
      else this.counters = {};
    },
  },
});

export default useLoadingStore;
