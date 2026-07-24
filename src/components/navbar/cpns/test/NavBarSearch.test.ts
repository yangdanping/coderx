import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NavBarSearch from '../NavBarSearch.vue';
import { search } from '@/service/article/article.request';
import useRootStore from '@/stores/index.store';
import LocalCache, { FAVORITE_SEARCH_HISTORY_STORAGE_KEY, SEARCH_HISTORY_STORAGE_KEY } from '@/utils/LocalCache';

const mountedWrappers: VueWrapper[] = [];
let updateMobileViewport = (_matches: boolean) => undefined;
let activeRouter: Router;

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
  activeRouter = router;
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

  it('anchors a decorative custom sparkle to the search icon', async () => {
    const wrapper = await mountSearch('MacIntel');

    const iconWrap = wrapper.get('.search-trigger-icon-wrap');
    expect(iconWrap.find('.search-trigger-icon').exists()).toBe(true);

    const sparkle = iconWrap.get('svg.search-trigger-sparkle');
    expect(sparkle.attributes('aria-hidden')).toBe('true');
    expect(sparkle.attributes('focusable')).toBe('false');
    expect(sparkle.find('path').exists()).toBe(true);
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

  it('wraps backward focus to the final visible history action', async () => {
    window.localStorage.setItem('coderx_search_history', JSON.stringify(['Vue']));
    const wrapper = await mountSearch('MacIntel', true);

    await wrapper.get('.search-trigger').trigger('click');
    await flushPromises();

    const input = wrapper.get<HTMLInputElement>('.search-input').element;
    const lastVisibleHistoryAction = wrapper.get<HTMLButtonElement>('.history-delete').element;
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));

    expect(document.activeElement).toBe(lastVisibleHistoryAction);
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

  it('restores keyword history to the input without navigating', async () => {
    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify([{ id: 'query:vue', value: 'Vue' }]));
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.history-item').trigger('click');
    await flushPromises();

    expect(wrapper.get<HTMLInputElement>('.search-input').element.value).toBe('Vue');
    expect(activeRouter.currentRoute.value.path).toBe('/');
    expect(wrapper.find('.search-dialog').exists()).toBe(true);
  });

  it('opens linked history directly in the article route', async () => {
    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify([{ id: 'article:21', value: 'Vue Query', articleId: 21 }]));
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.history-item').trigger('click');
    await flushPromises();

    expect(activeRouter.currentRoute.value.path).toBe('/article/21');
    expect(wrapper.find('.search-dialog').exists()).toBe(false);
  });

  it('keeps favorites when deleting the matching normal-history item', async () => {
    const article = { id: 'article:21', value: 'Vue Query', articleId: 21 };
    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify([article]));
    window.localStorage.setItem(FAVORITE_SEARCH_HISTORY_STORAGE_KEY, JSON.stringify([article]));
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.search-history-section .history-delete').trigger('click');

    expect(wrapper.find('.search-history-section').exists()).toBe(false);
    expect(wrapper.get('.favorite-history-section').text()).toContain('Vue Query');
    expect(LocalCache.getFavoriteSearchHistory()).toEqual([article]);
  });

  it('uses arrow keys and Enter to open the highlighted article', async () => {
    vi.mocked(search).mockResolvedValue({
      data: [
        { id: 21, title: 'Vue basics' },
        { id: 22, title: 'Vue Query' },
      ],
    } as never);
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.search-input').setValue('vue');
    await flushPromises();
    await wrapper.get('.search-input').trigger('keydown', { key: 'ArrowDown' });
    await wrapper.get('.search-input').trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(activeRouter.currentRoute.value.path).toBe('/article/22');
    expect(LocalCache.getSearchHistory()[0]).toMatchObject({ id: 'article:22', value: 'Vue Query' });
  });

  it('falls back to the full search page when no article is highlighted', async () => {
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.search-input').setValue('TypeScript');
    await flushPromises();
    await wrapper.get('.search-input').trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(activeRouter.currentRoute.value.fullPath).toBe('/search?q=TypeScript');
    expect(LocalCache.getSearchHistory()[0]).toEqual({ id: 'query:typescript', value: 'TypeScript' });
  });

  it('renders results as selectable options and announces async result counts', async () => {
    vi.mocked(search).mockResolvedValue({ data: [{ id: 21, title: 'Vue knowledge' }] } as never);
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.search-input').setValue('vue');
    await flushPromises();

    const result = wrapper.get<HTMLButtonElement>('.search-result-option');
    expect(result.element.tagName).toBe('BUTTON');
    expect(result.attributes('role')).toBe('option');
    expect(result.attributes('aria-selected')).toBe('true');
    expect(wrapper.get('[role="status"]').text()).toContain('找到 1 条相关内容');

    await result.trigger('click');
    await flushPromises();
    expect(activeRouter.currentRoute.value.path).toBe('/article/21');
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

  it('switches between search and loading icons while querying', async () => {
    let resolveSearch!: (value: unknown) => void;
    vi.mocked(search).mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }) as never,
    );
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.search-input').setValue('vue');
    await flushPromises();

    expect(wrapper.find('.search-loading-icon').exists()).toBe(true);
    expect(wrapper.find('.search-input-icon').exists()).toBe(false);

    resolveSearch({ data: [] });
    await flushPromises();

    expect(wrapper.find('.search-loading-icon').exists()).toBe(false);
    expect(wrapper.find('.search-input-icon').exists()).toBe(true);
  });

  it('clears the input without closing the dialog', async () => {
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');
    await wrapper.get('.search-input').setValue('Vue');
    await wrapper.get('.search-input-clear').trigger('click');
    await flushPromises();

    expect(wrapper.get<HTMLInputElement>('.search-input').element.value).toBe('');
    expect(wrapper.find('.search-dialog').exists()).toBe(true);
    expect(document.activeElement).toBe(wrapper.get<HTMLInputElement>('.search-input').element);
  });

  it('renders concise keyboard guidance without provider branding', async () => {
    const wrapper = await mountSearch();

    await wrapper.get('.search-trigger').trigger('click');

    const footer = wrapper.get('.search-footer');
    expect(footer.text()).toContain('选择');
    expect(footer.text()).toContain('切换');
    expect(footer.text()).toContain('关闭');
    expect(wrapper.text().toLocaleLowerCase()).not.toContain('algolia');
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

  it('uses reversible fine-pointer motion with keyboard and reduced-motion fallbacks', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavBarSearch.vue'), 'utf8');
    const iconBlock = source.match(/\.search-trigger-icon\s*{([\s\S]*?)\n}/)?.[1] ?? '';
    const sparkleBlock = source.match(/\.search-trigger-sparkle\s*{([\s\S]*?)\n}/)?.[1] ?? '';
    const finePointerStart = source.indexOf('@media (hover: hover) and (pointer: fine)');
    const reducedMotionStart = source.indexOf('@media (prefers-reduced-motion: reduce)');
    const mobileStylesStart = source.lastIndexOf('@media (max-width: 768px)');
    const finePointerStyles = source.slice(finePointerStart, reducedMotionStart);
    const reducedMotionStyles = source.slice(reducedMotionStart, mobileStylesStart);

    expect(sparkleBlock).toContain('position: absolute;');
    expect(sparkleBlock).toContain('top: -5px;');
    expect(sparkleBlock).toContain('right: -5px;');
    expect(sparkleBlock).toContain('pointer-events: none;');
    expect(sparkleBlock).toContain('opacity: 0;');
    expect(sparkleBlock).toContain('transform: scale(0.55) rotate(-75deg);');
    expect(sparkleBlock).toMatch(/transition:[\s\S]*?opacity[\s\S]*?transform/);
    expect(iconBlock).not.toMatch(/transform|transition/);
    expect(source).toMatch(/\.search-trigger:focus-visible[\s\S]*?\.search-trigger-sparkle[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*scale\(1\) rotate\(0deg\);/);
    expect(finePointerStyles).toMatch(/\.search-trigger:hover[\s\S]*?\.search-trigger-sparkle[\s\S]*?opacity:\s*1;/);
    expect(source).not.toMatch(/\.search-trigger:focus-visible\s+\.search-trigger-icon/);
    expect(finePointerStyles).not.toMatch(/\.search-trigger:hover\s+\.search-trigger-icon/);
    expect(reducedMotionStyles).toMatch(/\.search-trigger-sparkle[\s\S]*?transition:\s*none;/);
    expect(reducedMotionStyles).toMatch(/\.search-trigger-sparkle[\s\S]*?transform:\s*scale\(1\) rotate\(0deg\);/);
  });

  it('defines compact mobile layout without shortcut noise and keeps touch targets usable', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavBarSearch.vue'), 'utf8');
    const mobileStyles = source.slice(source.lastIndexOf('@media (max-width: 768px)'));

    expect(mobileStyles).toMatch(/\.search\s*{[\s\S]*?width:\s*auto;/);
    expect(mobileStyles).toMatch(/\.search-shortcut\s*{[\s\S]*?display:\s*none;/);
    expect(mobileStyles).toMatch(/\.search-trigger\s*{[\s\S]*?min-width:\s*3\.667rem;[\s\S]*?height:\s*3\.667rem;/);
    expect(mobileStyles).toMatch(/\.search-dialog-close\s*{[\s\S]*?width:\s*3\.667rem;[\s\S]*?height:\s*3\.667rem;/);
    expect(mobileStyles).toMatch(/\.search-dialog\s*{[\s\S]*?width:\s*calc\(100vw - 24px\);/);
    expect(mobileStyles).toMatch(/\.search-dialog\s*{[\s\S]*?max-height:\s*calc\(100dvh - 24px\);/);
    expect(mobileStyles).not.toMatch(/\.search-dialog\s*{[\s\S]*?min-height:\s*100(?:d)?vh;/);
  });

  it('provides a compound focus treatment and landscape safe-area padding', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavBarSearch.vue'), 'utf8');
    const mobileStyles = source.slice(source.lastIndexOf('@media (max-width: 768px)'));

    expect(source).toMatch(/\.search-input-shell\s*{[\s\S]*?&:focus-within\s*{[\s\S]*?box-shadow:/);
    expect(mobileStyles).toContain('env(safe-area-inset-left)');
    expect(mobileStyles).toContain('env(safe-area-inset-right)');
  });

  it('uses compact theme-aware panel dimensions and restrained overlay styling', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavBarSearch.vue'), 'utf8');
    const historySource = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/SearchHistorySection.vue'), 'utf8');
    const dialogStyles = source.match(/\.search-dialog\s*{([\s\S]*?)\n}/)?.[1] ?? '';
    const overlayStyles = source.match(/\.search-overlay\s*{([\s\S]*?)\n}/)?.[1] ?? '';

    expect(dialogStyles).toMatch(/width:\s*min\(640px,\s*100%\)/);
    expect(dialogStyles).toMatch(/max-height:\s*min\(70dvh,\s*560px\)/);
    expect(dialogStyles).toContain('var(--glass-bg-popup)');
    expect(overlayStyles).toContain('color-mix(');
    expect(overlayStyles).toMatch(/backdrop-filter:\s*blur\([1-3]px\)/);
    expect(source).toContain('color-mix(');
    expect(historySource).toContain('var(--text-primary)');
    expect(historySource).toContain('var(--el-color-primary)');
    expect(source).not.toContain('组合式 API');
  });

  it('hides the browser-native search cancel control beside the custom clear button', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavBarSearch.vue'), 'utf8');

    expect(source).toMatch(/\.search-input::?-webkit-search-cancel-button\s*{[\s\S]*?display:\s*none;/);
  });
});
