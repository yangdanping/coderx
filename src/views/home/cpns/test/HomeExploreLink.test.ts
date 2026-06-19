import { mount } from '@vue/test-utils';
import fs from 'node:fs';
import path from 'node:path';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';
import HomeExploreLink from '../HomeExploreLink.vue';

const RouterLinkStub = defineComponent({
  name: 'RouterLink',
  props: {
    to: {
      type: [String, Object],
      required: true,
    },
  },
  template: '<a><slot /></a>',
});

describe('HomeExploreLink', () => {
  function mountLink() {
    return mount(HomeExploreLink, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });
  }

  it('links new visitors to the article column', () => {
    const wrapper = mountLink();
    const link = wrapper.getComponent(RouterLinkStub);

    expect(link.props('to')).toEqual({ name: 'article' });
    expect(link.text()).toContain('Start Exploring');
  });

  it('keeps visual effects decorative', () => {
    const wrapper = mountLink();

    expect(wrapper.get('.home-explore-link__ascii-shadow').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('.home-explore-link__curl').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('.home-explore-link__contact-shadow').attributes('aria-hidden')).toBe('true');
  });

  it('defines accessible interaction, theme, and motion fallbacks', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/views/home/cpns/HomeExploreLink.vue'), 'utf8');

    expect(source).toContain(':focus-visible');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('@media (hover: none)');
    expect(source).toContain(':where(html.dark) &');
    expect(source).toContain('min-height: 64px');
    expect(source).not.toContain('filter 180ms');
  });
});
