import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useHistoryStore from '@/stores/history.store';
import UserHistory from '../UserHistory.vue';
import type { IHistoryItem } from '@/stores/types/history.result';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
}

const makeHistoryItem = (articleId: number): IHistoryItem => ({
  id: articleId,
  articleId,
  title: `Article ${articleId}`,
  author: {
    id: articleId,
    name: `Author ${articleId}`,
    avatarUrl: '',
  },
  views: 0,
  likes: 0,
  commentCount: 0,
  cover: '',
  articleUrl: '',
  createAt: '',
  updateAt: '',
});

const historyItemStub = defineComponent({
  props: {
    item: {
      type: Object,
      required: true,
    },
    deletingItems: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {
    return () => h('div', { class: 'history-list-item' }, (props.item as IHistoryItem).title);
  },
});

function mountUserHistory() {
  return mount(UserHistory, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            user: {
              profile: {
                id: 1,
                sex: '男',
              },
            },
            history: {
              historyList: [makeHistoryItem(101), makeHistoryItem(102)],
              total: 3,
              pageNum: 1,
              pageSize: 2,
              loading: false,
            },
          },
        }),
      ],
      stubs: {
        UserHistoryListItem: historyItemStub,
        ElButton: true,
        ElCheckbox: true,
        ElCheckboxGroup: true,
        ElSkeleton: true,
      },
    },
  });
}

describe('UserHistory', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances.length = 0;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the next history page when the bottom sentinel enters the viewport', async () => {
    mountUserHistory();
    const historyStore = useHistoryStore();

    await nextTick();
    const observer = MockIntersectionObserver.instances.at(-1);
    observer?.callback([{ isIntersecting: true } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);

    expect(historyStore.getHistoryAction).toHaveBeenCalledWith(false);
  });

  it('keeps selected history items when automatic loading is triggered', async () => {
    const wrapper = mountUserHistory();
    const historyStore = useHistoryStore();

    (wrapper.vm as unknown as { selectedItems: number[] }).selectedItems = [101];
    await nextTick();

    const observer = MockIntersectionObserver.instances.at(-1);
    observer?.callback([{ isIntersecting: true } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);

    expect((wrapper.vm as unknown as { selectedItems: number[] }).selectedItems).toEqual([101]);
    expect(historyStore.getHistoryAction).toHaveBeenCalledWith(false);
  });
});
