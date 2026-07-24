import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SearchHistorySection from '../SearchHistorySection.vue';

describe('SearchHistorySection', () => {
  it('renders linked state and emits row actions without mutating items', async () => {
    const item = { id: 'article:21', value: 'Vue Query', articleId: 21 };
    const wrapper = mount(SearchHistorySection, {
      props: {
        title: '搜索历史',
        items: [item],
        favoriteIds: new Set<string>(),
        clearable: true,
      },
    });

    expect(wrapper.get('.history-item').attributes('aria-label')).toContain('打开文章');

    await wrapper.get('.history-item').trigger('click');
    await wrapper.get('.history-favorite').trigger('click');
    await wrapper.get('.history-delete').trigger('click');
    await wrapper.get('.history-clear').trigger('click');

    expect(wrapper.emitted('activate')?.[0]).toEqual([item]);
    expect(wrapper.emitted('toggleFavorite')?.[0]).toEqual([item]);
    expect(wrapper.emitted('remove')?.[0]).toEqual([item.id]);
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('marks favorites accessibly and omits clear when disabled', () => {
    const item = { id: 'query:vue', value: 'Vue' };
    const wrapper = mount(SearchHistorySection, {
      props: {
        title: '收藏',
        items: [item],
        favoriteIds: new Set(['query:vue']),
      },
    });

    expect(wrapper.get('.history-favorite').attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('.history-item').attributes('aria-label')).toContain('填入搜索框');
    expect(wrapper.find('.history-clear').exists()).toBe(false);
  });
});
