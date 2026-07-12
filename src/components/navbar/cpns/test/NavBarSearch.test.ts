import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NavBarSearch from '../NavBarSearch.vue';
import { search } from '@/service/article/article.request';
import useRootStore from '@/stores/index.store';

const mountedWrappers: VueWrapper[] = [];
let updateMobileViewport = (_matches: boolean) => undefined;

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

function setMobileViewport(matches: boolean) {
  const changeListeners = new Set<(event: MediaQueryListEvent) => void>();
  let currentMatches = matches;
  const mediaQuery = {
    get matches() {
      return currentMatches;
    },
    media: '(max-width: 768px)',
    onchange: null,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => changeListeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => changeListeners.delete(listener)),
    addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => changeListeners.add(listener)),
    removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => changeListeners.delete(listener)),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  updateMobileViewport = (nextMatches: boolean) => {
    currentMatches = nextMatches;
    const event = { matches: nextMatches, media: mediaQuery.media } as MediaQueryListEvent;
    changeListeners.forEach((listener) => listener(event));
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => mediaQuery),
  });
}

async function finishDialogLeave(wrapper: VueWrapper) {
  wrapper.getComponent({ name: 'transition' }).vm.$emit('after-leave');
  await flushPromises();
}

async function mountSearch(platform = 'MacIntel', mobile = false) {
  setPlatform(platform);
  setMobileViewport(mobile);

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

  const wrapper = mount(NavBarSearch, {
    attachTo: document.body,
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

  mountedWrappers.push(wrapper);
  return wrapper;
}

describe('NavBarSearch', () => {
  beforeEach(() => {
    installLocalStorage();
    window.localStorage.clear();
    document.body.style.overflow = '';
    vi.clearAllMocks();
    vi.mocked(search).mockResolvedValue({ data: [] } as never);

    const appRoot = document.createElement('div');
    appRoot.id = 'app';
    document.body.appendChild(appRoot);
  });

  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  it('renders a compact search trigger with the macOS shortcut instead of a fixed input', async () => {
    const wrapper = await mountSearch('MacIntel');

    expect(wrapper.find('.search-trigger').exists()).toBe(true);
    expect(wrapper.find('.search-trigger').text()).toContain('⌘\u00a0K');
    expect(wrapper.find('.search > .el-input__inner').exists()).toBe(false);
  });

  it('contains desktop focus while open and restores the trigger after backdrop close', async () => {
    const wrapper = await mountSearch();
    const appRoot = document.querySelector<HTMLElement>('#app')!;
    const trigger = wrapper.get<HTMLButtonElement>('.search-trigger').element;

    await wrapper.get('.search-trigger').trigger('click');
    await flushPromises();
    expect(wrapper.find('.search-dialog').exists()).toBe(true);
    expect(wrapper.find('.search-dialog-close').exists()).toBe(false);
    expect(appRoot.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(wrapper.get<HTMLInputElement>('.search-input').element);

    await wrapper.get('.search-overlay').trigger('click');
    await flushPromises();
    expect(wrapper.find('.search-dialog').exists()).toBe(false);
    expect(appRoot.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).not.toBe(trigger);

    await finishDialogLeave(wrapper);
    expect(appRoot.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('shows a mobile close control, focuses it, and traps forward/backward tab navigation', async () => {
    const wrapper = await mountSearch('MacIntel', true);
    const trigger = wrapper.get<HTMLButtonElement>('.search-trigger').element;

    await wrapper.get('.search-trigger').trigger('click');
    await flushPromises();

    const input = wrapper.get<HTMLInputElement>('.search-input').element;
    const close = wrapper.get<HTMLButtonElement>('.search-dialog-close').element;
    expect(document.activeElement).toBe(close);

    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(input);

    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(close);

    await wrapper.get('.search-dialog-close').trigger('click');
    await flushPromises();
    expect(wrapper.find('.search-dialog').exists()).toBe(false);

    await finishDialogLeave(wrapper);
    expect(document.activeElement).toBe(trigger);
  });

  it('adds the mobile close control if the viewport becomes mobile while the dialog is open', async () => {
    const wrapper = await mountSearch('MacIntel', false);

    await wrapper.get('.search-trigger').trigger('click');
    await flushPromises();
    expect(wrapper.find('.search-dialog-close').exists()).toBe(false);

    updateMobileViewport(true);
    await flushPromises();
    expect(wrapper.find('.search-dialog-close').exists()).toBe(true);

    await wrapper.get('.search-dialog-close').trigger('click');
    await finishDialogLeave(wrapper);
  });

  it('restores the original page state after reopening before the first leave finishes', async () => {
    document.body.style.overflow = 'clip';
    const wrapper = await mountSearch();
    const appRoot = document.querySelector<HTMLElement>('#app')!;

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.search-overlay').trigger('click');
    await wrapper.get('.search-trigger').trigger('click');
    await flushPromises();

    expect(document.body.style.overflow).toBe('hidden');
    expect(appRoot.hasAttribute('inert')).toBe(true);

    await wrapper.get('.search-overlay').trigger('click');
    await finishDialogLeave(wrapper);

    expect(document.body.style.overflow).toBe('clip');
    expect(appRoot.hasAttribute('inert')).toBe(false);
  });

  it('skips v-show-hidden history controls when wrapping focus backward', async () => {
    window.localStorage.setItem('coderx_search_history', JSON.stringify(['Vue']));
    const wrapper = await mountSearch('MacIntel', true);

    await wrapper.get('.search-trigger').trigger('click');
    await flushPromises();

    const input = wrapper.get<HTMLInputElement>('.search-input').element;
    const lastVisibleHistoryItem = wrapper.get<HTMLButtonElement>('.history-item').element;
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));

    expect(document.activeElement).toBe(lastVisibleHistoryItem);
  });

  it('restores focus and background interactivity when Escape closes the dialog', async () => {
    const wrapper = await mountSearch();
    const trigger = wrapper.get<HTMLButtonElement>('.search-trigger').element;
    const appRoot = document.querySelector<HTMLElement>('#app')!;

    await wrapper.get('.search-trigger').trigger('click');
    await flushPromises();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();

    expect(wrapper.find('.search-dialog').exists()).toBe(false);
    expect(appRoot.hasAttribute('inert')).toBe(true);

    await finishDialogLeave(wrapper);
    expect(appRoot.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('normalizes casing and surrounding whitespace before requesting quick-search results', async () => {
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.search-input').setValue('  Vue  ');
    await flushPromises();

    expect(search).toHaveBeenCalledWith('vue', expect.anything());
  });

  it('renders results as safe native links and announces async result counts', async () => {
    vi.mocked(search).mockResolvedValue({ data: [{ id: 21, title: 'Vue knowledge' }] } as never);
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.search-input').setValue('vue');
    await flushPromises();

    const result = wrapper.get<HTMLAnchorElement>('.result-item');
    expect(result.element.tagName).toBe('A');
    expect(result.attributes('href')).toBe('/article/21');
    expect(result.attributes('target')).toBe('_blank');
    expect(result.attributes('rel')).toContain('noopener');
    expect(result.attributes('rel')).toContain('noreferrer');
    expect(wrapper.get('[role="status"]').text()).toContain('找到 1 条相关内容');

    await result.trigger('click');
    expect(wrapper.find('.search-dialog').exists()).toBe(false);
  });

  it('shows a recoverable error instead of presenting request failures as empty results', async () => {
    vi.mocked(search).mockRejectedValue(new Error('network'));
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.search-input').setValue('vue');
    await flushPromises();

    expect(wrapper.get('.search-error').text()).toContain('搜索失败，请稍后重试');
    expect(wrapper.get('[role="status"]').text()).toContain('搜索失败，请稍后重试');
  });

  it('uses Ctrl+K on non-Apple platforms', async () => {
    const wrapper = await mountSearch('Win32');

    expect(wrapper.find('.search-trigger').text()).toContain('Ctrl\u00a0K');
  });

  it('keeps the navbar search trigger visually unframed', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavBarSearch.vue'), 'utf8');
    const triggerBlock = source.match(/\.search-trigger\s*{([\s\S]*?)\n}/)?.[1] ?? '';
    const shortcutBlock = source.match(/\.search-shortcut\s*{([\s\S]*?)\n}/)?.[1] ?? '';

    expect(triggerBlock).toContain('border: 0;');
    expect(triggerBlock).toContain('background: transparent;');
    expect(triggerBlock).not.toMatch(/border:\s*1px/);
    expect(shortcutBlock).toContain('border: 0;');
    expect(shortcutBlock).toContain('background: transparent;');
    expect(shortcutBlock).not.toMatch(/border:\s*1px/);
  });

  it('defines compact mobile layout without shortcut noise and keeps touch targets usable', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavBarSearch.vue'), 'utf8');
    const mobileStyles = source.slice(source.lastIndexOf('@media (max-width: 768px)'));

    expect(mobileStyles).toMatch(/\.search\s*{[\s\S]*?width:\s*auto;/);
    expect(mobileStyles).toMatch(/\.search-shortcut\s*{[\s\S]*?display:\s*none;/);
    expect(mobileStyles).toMatch(/\.search-trigger\s*{[\s\S]*?min-width:\s*3\.667rem;[\s\S]*?height:\s*3\.667rem;/);
    expect(mobileStyles).toMatch(/\.search-dialog-close\s*{[\s\S]*?width:\s*3\.667rem;[\s\S]*?height:\s*3\.667rem;/);
  });

  it('provides a compound focus treatment and landscape safe-area padding', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavBarSearch.vue'), 'utf8');
    const mobileStyles = source.slice(source.lastIndexOf('@media (max-width: 768px)'));

    expect(source).toMatch(/\.search-input-shell\s*{[\s\S]*?&:focus-within\s*{[\s\S]*?box-shadow:/);
    expect(mobileStyles).toContain('env(safe-area-inset-left)');
    expect(mobileStyles).toContain('env(safe-area-inset-right)');
  });
});
