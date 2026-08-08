import { flushPromises, mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';

import NavMenu from '../NavMenu.vue';

const mountMenu = async (initialPath = '/') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/article', component: { template: '<div />' } },
      { path: '/flow', component: { template: '<div />' } },
      { path: '/dev', component: { template: '<div />' } },
    ],
  });

  await router.push(initialPath);
  await router.isReady();

  const wrapper = mount(NavMenu, {
    global: {
      plugins: [router],
    },
  });

  return { router, wrapper };
};

describe('NavMenu', () => {
  it('renders route switch buttons in English while preserving order', async () => {
    const { wrapper } = await mountMenu();

    expect(wrapper.findAll('.menu-item').map((item) => item.text())).toEqual(['Home', 'Articles', 'Flow']);
  });

  it('keeps the Flow button on its existing special font treatment', async () => {
    const { wrapper } = await mountMenu('/flow');
    const flowItem = wrapper.findAll('.menu-item').at(2);

    expect(flowItem?.classes()).toContain('special-flow');
  });

  it('routes normal clicks in-app but leaves modified link clicks to the browser', async () => {
    const { router, wrapper } = await mountMenu();
    const articlesLink = wrapper.findAll('.menu-item').at(1);

    articlesLink?.element.addEventListener('click', (event) => event.preventDefault(), { once: true });
    await articlesLink?.trigger('click', { metaKey: true });
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/');

    await articlesLink?.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/article');
  });

  it('uses markdown editor typography for non-Flow route buttons', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavMenu.vue'), 'utf8');
    const menuItemBlock = source.match(/\.menu-item\s*{([\s\S]*?)&:hover/)?.[1] ?? '';
    const flowBlock = source.match(/&\.special-flow\s*{([\s\S]*?)\n\s*}/)?.[1] ?? '';

    expect(source).toContain('font-family: var(--markdown-editor-font)');
    expect(menuItemBlock).toContain('font-weight: 400;');
    expect(source).toContain('letter-spacing: 0.18em');
    expect(source).toContain('text-transform: uppercase');
    expect(source).toContain('&.special-flow');
    expect(flowBlock).toContain('font-weight: 600;');
  });

  it('keeps the Flow label on its historical gradient independently from the Home X treatment', () => {
    const navMenuSource = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavMenu.vue'), 'utf8');
    const commonStyles = readFileSync(join(process.cwd(), 'src/assets/css/common.scss'), 'utf8');
    const flowBlock = navMenuSource.match(/&\.special-flow\s*{([\s\S]*?)\n\s*}/)?.[1] ?? '';

    expect(commonStyles).toContain(
      '--flow-nav-gradient: linear-gradient(135deg, rgba(143, 235, 135, 0.7) 30%, rgba(56, 72, 249, 0.7) 100%);',
    );
    expect(flowBlock).toContain('background-image: var(--flow-nav-gradient);');
    expect(flowBlock).not.toContain('var(--xfontStyle)');
  });
});
