import { mount } from '@vue/test-utils';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NavBarSearch from '../NavBarSearch.vue';
import useRootStore from '@/stores/index.store';

function installLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (key: string) => store.delete(key),
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
}

vi.mock('@/service/article/article.request', () => ({
  search: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils')>();
  return {
    ...actual,
    debounce: (fn: () => void) => fn,
  };
});

function setPlatform(platform: string) {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  });
}

async function mountSearch(platform = 'MacIntel') {
  setPlatform(platform);

  const pinia = createPinia();
  setActivePinia(pinia);
  const rootStore = useRootStore();
  rootStore.windowInfo = { width: 1280, height: 800 };

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/search', component: { template: '<div />' } },
      { name: 'detail', path: '/article/:articleId', component: { template: '<div />' } },
    ],
  });
  await router.push('/');
  await router.isReady();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return mount(NavBarSearch, {
    global: {
      plugins: [pinia, router, [VueQueryPlugin, { queryClient }]],
      stubs: {
        Teleport: true,
        ElButton: {
          template: '<button class="el-button" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
        },
        ElCard: {
          template: '<section class="el-card"><header v-if="$slots.header"><slot name="header" /></header><slot /></section>',
        },
        ElIcon: {
          template: '<span class="el-icon"><slot /></span>',
        },
        ElInput: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input class="el-input__inner" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @focus="$emit(\'focus\')" @keyup.enter="$emit(\'keyup\', $event)" />',
        },
      },
      directives: {
        loading: {},
      },
    },
  });
}

describe('NavBarSearch', () => {
  beforeEach(() => {
    installLocalStorage();
    window.localStorage.clear();
  });

  it('renders a compact search trigger with the macOS shortcut instead of a fixed input', async () => {
    const wrapper = await mountSearch('MacIntel');

    expect(wrapper.find('.search-trigger').exists()).toBe(true);
    expect(wrapper.find('.search-trigger').text()).toContain('⌘\u00a0K');
    expect(wrapper.find('.search > .el-input__inner').exists()).toBe(false);
  });

  it('opens the search dialog from the trigger and closes it from the backdrop', async () => {
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    expect(wrapper.find('.search-dialog').exists()).toBe(true);
    expect(wrapper.find('.search-dialog-close').exists()).toBe(false);

    await wrapper.get('.search-overlay').trigger('click');
    expect(wrapper.find('.search-dialog').exists()).toBe(false);
  });

  it('uses Ctrl+K on non-Apple platforms', async () => {
    const wrapper = await mountSearch('Win32');

    expect(wrapper.find('.search-trigger').text()).toContain('Ctrl\u00a0K');
  });
});
