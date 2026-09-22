<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ChevronLeft, Settings } from '@lucide/vue';
import ListItem from '@/components/list/ListItem.vue';
import ArticleAction from '@/components/list/cpns/ArticleAction.vue';
import { useArticleList, useLikeArticle, useUserLikedArticles } from '@/composables/useArticleList';
import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
import useUserStore from '@/stores/user.store';
import { Msg } from '@/utils';
import type { ICollect } from '@/stores/types/user.result';
import type { ComponentPublicInstance } from 'vue';

const props = defineProps<{ collect: ICollect; canManage: boolean }>();
const emit = defineEmits<{ back: [] }>();
const userStore = useUserStore();
const articleIds = computed(() => props.collect.count ?? []);
const requestParams = computed(() => ({ idList: articleIds.value, pageOrder: 'date' }));
const { data, items, isPending, isError, isFetchNextPageError, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useArticleList(
  requestParams,
  computed(() => articleIds.value.length > 0),
);
const total = computed(() => (articleIds.value.length ? (data.value?.pages[0]?.total ?? articleIds.value.length) : 0));
const visibleItems = computed(() => (articleIds.value.length ? items.value : []));
const initialLoading = computed(() => articleIds.value.length > 0 && isPending.value);
const { isLiked } = useUserLikedArticles();
const { mutate: likeArticle } = useLikeArticle();
const handleLike = (articleId: number) => likeArticle(String(articleId));
const managing = ref(false);
const selectedIds = ref<number[]>([]);
const removing = ref(false);
const loadedIds = computed(() => visibleItems.value.flatMap((item) => (typeof item.id === 'number' ? [item.id] : [])));
const allLoadedSelected = computed({
  get: () => loadedIds.value.length > 0 && loadedIds.value.every((id) => selectedIds.value.includes(id)),
  set: (checked: boolean) => {
    selectedIds.value = checked ? [...loadedIds.value] : [];
  },
});

const { infiniteSentinel, tryLoadMore } = useInfiniteScroll({
  canLoadMore: computed(() => Boolean(hasNextPage.value) && !isError.value && !removing.value && articleIds.value.length > 0),
  isLoading: isFetching,
  loadMore: () => fetchNextPage(),
});

function setInfiniteSentinel(element: Element | ComponentPublicInstance | null) {
  infiniteSentinel.value = element instanceof HTMLElement ? element : null;
}

function toggleManagement() {
  managing.value = !managing.value;
  selectedIds.value = [];
}

async function removeSelected() {
  if (!props.canManage || removing.value || !selectedIds.value.length) return;
  removing.value = true;
  try {
    const remainingIds = await userStore.removeCollectArticle(props.collect.id, [...selectedIds.value]);
    if (remainingIds !== null) {
      managing.value = false;
      selectedIds.value = [];
    }
  } catch {
    Msg.showFail('移除文章失败，请重试');
  } finally {
    removing.value = false;
  }
}

watch(
  () => props.canManage,
  (canManage) => {
    if (!canManage) {
      managing.value = false;
      selectedIds.value = [];
    }
  },
);
</script>

<template>
  <section class="collect-articles">
    <div class="list-header">
      <h2>
        <button type="button" class="back" aria-label="返回收藏夹列表" :disabled="removing" @click="emit('back')"><ChevronLeft aria-hidden="true" /></button>
        收藏夹"{{ collect.name }}"下的文章({{ total }})
      </h2>
      <el-button
        v-if="canManage && visibleItems.length"
        :aria-label="managing ? '退出批量操作' : '进入批量操作'"
        :disabled="removing"
        :icon="Settings"
        circle
        @click="toggleManagement"
      />
    </div>
    <div class="list">
      <div v-if="managing && canManage" class="setting">
        <label><input v-model="allLoadedSelected" type="checkbox" :disabled="removing" /> 全选已加载文章</label>
        <el-popconfirm title="确定移除已选文章吗？" confirm-button-text="确定" cancel-button-text="取消" @confirm="removeSelected">
          <template #reference><el-button :disabled="!selectedIds.length || removing" :loading="removing" type="danger" plain>移除</el-button></template>
        </el-popconfirm>
        <span v-if="selectedIds.length">已选择{{ selectedIds.length }}篇文章</span>
      </div>
      <el-skeleton v-if="initialLoading" animated :rows="5" />
      <div v-else-if="isError && !visibleItems.length && articleIds.length" class="list-state error-state" role="alert">
        收藏文章加载失败
        <el-button aria-label="重试加载收藏文章" :disabled="isFetching" @click="() => refetch()">重试</el-button>
      </div>
      <div v-else-if="!visibleItems.length" class="list-state">该收藏夹还没有文章</div>
      <template v-else>
        <ListItem v-for="item in visibleItems" :key="item.id" :item="item">
          <template v-if="managing && canManage" #checkbox>
            <input v-model="selectedIds" type="checkbox" :value="item.id" :aria-label="`选择文章${item.title ?? item.id}`" :disabled="removing" />
          </template>
          <template #action><ArticleAction :article="item" :isLiked="isLiked" :onLike="handleLike" /></template>
        </ListItem>
        <div v-if="isFetchNextPageError" class="list-state error-state" role="alert">
          更多收藏文章加载失败
          <el-button aria-label="重试加载更多收藏文章" :disabled="isFetching || removing" @click="() => fetchNextPage()">重试</el-button>
        </div>
        <div v-else-if="isError" class="list-state error-state" role="alert">
          收藏文章刷新失败
          <el-button aria-label="重试加载收藏文章" :disabled="isFetching || removing" @click="() => refetch()">重试</el-button>
        </div>
        <div v-else-if="hasNextPage" class="list-state">
          <el-button aria-label="加载更多收藏文章" :disabled="isFetching || removing" :loading="isFetchingNextPage" @click="tryLoadMore">
            {{ isFetchingNextPage ? '加载中…' : '加载更多' }}
          </el-button>
        </div>
        <div v-else class="list-state">没有更多了</div>
      </template>
      <div :ref="setInfiniteSentinel" class="infinite-sentinel" aria-hidden="true" />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.list-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 0 10px 10px;
  @include thin-border(bottom, var(--border-color-list));

  h2 {
    display: flex;
    align-items: center;
    min-width: 0;
    color: var(--collect-title);
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
}

.back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  margin-right: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--collect-muted);
  cursor: pointer;

  &:hover {
    background: var(--collect-icon-bg-hover);
  }
  &:focus-visible {
    outline: 2px solid var(--collect-focus-ring);
    outline-offset: 2px;
  }
  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
}

.list {
  padding: 0 20px;
}
.setting {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 10px 0;
  color: var(--collect-muted);
}
.list-state {
  padding: 20px 0;
  color: var(--collect-muted);
  text-align: center;
}
.error-state {
  color: var(--el-color-danger);
}
.infinite-sentinel {
  width: 100%;
  height: 1px;
}
input[type='checkbox'] {
  accent-color: var(--el-color-primary);
}
</style>
