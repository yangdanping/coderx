<script lang="ts" setup>
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue';
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/vue';
import { isSortable } from '@dnd-kit/vue/sortable';
import { ListRestart, Settings2, X } from '@lucide/vue';
import { storeToRefs } from 'pinia';

import { emitter, Msg, throttle } from '@/utils';
import { mergeTagsByPreference, writeGuestTagOrder } from '@/utils/tagOrderPreference';
import useRootStore from '@/stores/index.store';
import useArticleStore from '@/stores/article.store';
import { saveTagOrder } from '@/service/article/article.request';
import { useTagOrder } from '@/composables/useTagOrder';
import Tabs from '@/components/common/Tabs.vue';
import SortableTagItem from './SortableTagItem.vue';
import MobileTagOrderDrawer from './MobileTagOrderDrawer.vue';

import type { Itag } from '@/stores/types/article.result';

const props = defineProps<{
  tags?: Itag[];
}>();

const rootStore = useRootStore();
const articleStore = useArticleStore();
const { isSmallScreen, authStatus } = storeToRefs(rootStore);
const { activeTagId } = storeToRefs(articleStore);

const activeId = shallowRef<string | number>(activeTagId.value);
const isDesktopEditing = shallowRef(false);
const isMobileEditorOpen = shallowRef(false);
const entryAnimating = shallowRef(false);
const navRef = useTemplateRef<HTMLElement>('navRef');
let resizeObserver: ResizeObserver | null = null;
let entryAnimationTimer: ReturnType<typeof setTimeout> | null = null;

const tabDirection = computed<'horizontal' | 'vertical'>(() => (isSmallScreen.value ? 'horizontal' : 'vertical'));
const canPersistOrder = computed(() => authStatus.value !== 'checking');
const tagDragMode = computed<'none' | 'item'>(() => (tabDirection.value === 'vertical' && isDesktopEditing.value && canPersistOrder.value ? 'item' : 'none'));
const overviewClasses = computed(() => ({
  horizontal: tabDirection.value === 'horizontal',
  vertical: tabDirection.value === 'vertical',
  'is-active': activeId.value === '综合',
  'is-editing': isDesktopEditing.value,
}));

const persistOrder = async (tagIds: number[]) => {
  if (authStatus.value === 'authenticated') return saveTagOrder(tagIds);
  if (authStatus.value === 'checking') return { code: -1, msg: '登录状态确认中' };

  writeGuestTagOrder(tagIds);
  return {
    code: 0,
    data: mergeTagsByPreference(props.tags ?? [], tagIds),
  };
};

const { orderedTags, isSaving, syncTags, reorderAndSave } = useTagOrder({
  saveOrder: persistOrder,
  onSaveError: () => Msg.showFail('顺序保存失败，已恢复原顺序'),
});

watch(
  () => props.tags ?? [],
  (nextTags) => syncTags(nextTags),
  { immediate: true },
);

watch(activeId, (newVal) => {
  activeTagId.value = newVal;
});

watch(isSmallScreen, (smallScreen) => {
  if (smallScreen) closeDesktopEditing();
  else isMobileEditorOpen.value = false;
});

const updateNavHeightVar = () => {
  if (isSmallScreen.value && navRef.value) {
    document.documentElement.style.setProperty('--article-nav-height', `${navRef.value.offsetHeight}px`);
  } else {
    document.documentElement.style.setProperty('--article-nav-height', '0px');
  }
};

const handleClick = throttle(function (name: string | number) {
  if (name) articleStore.activeTagId = name;
  window.scrollTo(0, 0);
}, 300);

const selectOverview = () => {
  activeId.value = '综合';
  handleClick('综合');
};

const handleTagSelect = (tagId: number) => {
  if (isDesktopEditing.value) return;
  activeId.value = tagId;
  handleClick(tagId);
};

const startEntryAnimation = () => {
  if (entryAnimationTimer) clearTimeout(entryAnimationTimer);
  entryAnimating.value = true;
  entryAnimationTimer = setTimeout(() => {
    entryAnimating.value = false;
    entryAnimationTimer = null;
  }, 520);
};

function closeDesktopEditing() {
  isDesktopEditing.value = false;
  entryAnimating.value = false;
  if (entryAnimationTimer) {
    clearTimeout(entryAnimationTimer);
    entryAnimationTimer = null;
  }
}

const toggleDesktopEditing = () => {
  if (isDesktopEditing.value) {
    closeDesktopEditing();
    return;
  }

  isDesktopEditing.value = true;
  startEntryAnimation();
};

const persistReorder = async (fromIndex: number, toIndex: number) => {
  const saved = await reorderAndSave(fromIndex, toIndex);
  if (saved) articleStore.tags = orderedTags.value.map((tag) => ({ ...tag }));
};

const handleDragEnd = async (event: DragEndEvent) => {
  if (tagDragMode.value !== 'item' || event.canceled) return;
  const source = event.operation.source;
  if (!isSortable(source) || source.initialIndex === source.index) return;

  await persistReorder(source.initialIndex, source.index);
};

const handleMobileReorder = (fromIndex: number, toIndex: number) => {
  if (!canPersistOrder.value) return;
  void persistReorder(fromIndex, toIndex);
};

const handleOutsidePointerDown = (event: PointerEvent) => {
  if (!isDesktopEditing.value || !(event.target instanceof Node)) return;
  if (!navRef.value?.contains(event.target)) closeDesktopEditing();
};

onMounted(() => {
  emitter.on('changeTagInList', (tag: Itag) => {
    if (tag.id == null) return;
    activeId.value = tag.id;
    articleStore.activeTagId = tag.id;
  });
  emitter.on('submitSearchValue', () => selectOverview());

  if (navRef.value) {
    resizeObserver = new ResizeObserver(updateNavHeightVar);
    resizeObserver.observe(navRef.value);
  }

  document.addEventListener('pointerdown', handleOutsidePointerDown, true);
  updateNavHeightVar();
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
  if (entryAnimationTimer) clearTimeout(entryAnimationTimer);
  document.documentElement.style.removeProperty('--article-nav-height');
});
</script>

<template>
  <div ref="navRef" class="article-nav-container" :class="{ 'is-sticky': isSmallScreen, 'is-editing': isDesktopEditing }">
    <Tabs v-model="activeId" :direction="tabDirection" class="nav-tabs">
      <div class="tab-item article-overview-item" :class="overviewClasses">
        <button type="button" class="overview-select" :aria-current="activeId === '综合' ? 'page' : undefined" @click="selectOverview">
          <span>综合</span>
          <span v-if="activeId === '综合' && tabDirection === 'horizontal'" class="active-bar" aria-hidden="true"></span>
        </button>
        <button
          v-if="tabDirection === 'vertical'"
          type="button"
          class="desktop-edit-toggle"
          :class="{ 'is-visible': isDesktopEditing }"
          :aria-label="isDesktopEditing ? '完成标签排序' : '调整标签顺序'"
          :aria-pressed="isDesktopEditing"
          data-test="desktop-edit-toggle"
          @click="toggleDesktopEditing"
        >
          <X v-if="isDesktopEditing" :size="14" aria-hidden="true" />
          <Settings2 v-else :size="14" aria-hidden="true" />
        </button>
      </div>

      <DragDropProvider @dragEnd="handleDragEnd">
        <SortableTagItem
          v-for="(item, index) in orderedTags"
          :key="item.id"
          :tag="item"
          :index="index"
          :active="activeId === item.id"
          :direction="tabDirection"
          :disabled="tagDragMode === 'none' || isSaving"
          :drag-mode="tagDragMode"
          :entry-animating="entryAnimating"
          :selectable="!isDesktopEditing"
          @select="handleTagSelect"
        />
      </DragDropProvider>
    </Tabs>

    <button
      v-if="tabDirection === 'horizontal'"
      type="button"
      class="mobile-edit-toggle"
      :disabled="!canPersistOrder"
      aria-label="调整标签顺序"
      data-test="mobile-edit-toggle"
      @click="isMobileEditorOpen = true"
    >
      <ListRestart :size="18" aria-hidden="true" />
    </button>

    <MobileTagOrderDrawer v-model="isMobileEditorOpen" :tags="orderedTags" :is-saving="isSaving" @reorder="handleMobileReorder" />
  </div>
</template>

<style lang="scss" scoped>
.article-nav-container {
  position: relative;
  width: 100%;

  &.is-sticky {
    @include glass-effect;
    @include thin-border(bottom, var(--border-color-list));
    width: 100%;
    padding: 0;

    &::after {
      position: absolute;
      top: 0;
      right: 42px;
      bottom: 0;
      z-index: 1;
      width: 22px;
      pointer-events: none;
      content: '';
      background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--el-bg-color) 88%, transparent));
    }
  }
}

.nav-tabs.horizontal {
  padding-right: 48px;
}

.nav-tabs.vertical {
  width: 100%;

  :deep(.tabs-content) {
    align-items: stretch;
    width: 100%;
  }
}

.article-overview-item {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  color: var(--fontColor);
  font-size: 1em;
  line-height: normal;

  &.vertical {
    justify-content: flex-start;
    width: 100%;
    box-sizing: border-box;
    padding: 6px 14px;
    border: 1px solid transparent;

    &:hover,
    &:focus-within {
      color: var(--el-color-primary);

      .desktop-edit-toggle {
        opacity: 0.72;
      }
    }

    &.is-active {
      color: var(--el-color-primary);
      font-weight: 600;
      background: rgba(64, 158, 255, 0.05);
      border-color: rgba(64, 158, 255, 0.2);
    }

    .overview-select {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
    }

    .desktop-edit-toggle {
      position: absolute;
      top: 50%;
      right: 2px;
      z-index: 1;
      width: 18px;
      height: 18px;
      margin-left: 0;
      transform: translateY(-50%);
    }
  }

  &.horizontal {
    flex: 0 0 auto;
    min-height: 44px;
    padding: 0 6px;

    &.is-active {
      color: var(--el-color-primary);
      font-weight: 600;
    }
  }
}

.overview-select,
.desktop-edit-toggle {
  color: inherit;
  font: inherit;
  line-height: inherit;
  background: transparent;
  border: 0;
}

.overview-select {
  position: relative;
  padding: 0;
  text-align: left;
  cursor: pointer;

  > span:not(.active-bar) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }
}

.desktop-edit-toggle {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: auto;
  padding: 0;
  cursor: pointer;
  opacity: 0;
  border-radius: 5px;
  transition:
    color 160ms ease,
    opacity 160ms ease,
    background-color 160ms ease;

  &:hover {
    color: var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 9%, transparent);
  }

  &:focus-visible,
  &.is-visible {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }
}

.active-bar {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 20px;
  height: 2px;
  background-color: var(--el-color-primary);
  border-radius: 1px;
  transform: translateX(-50%);
}

.mobile-edit-toggle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: auto;
  padding: 0;
  color: color-mix(in srgb, #81c995 62%, var(--fontColor));
  // 与 sticky 横栏背景重合，不单独成块
  background: color-mix(in srgb, var(--el-bg-color) 92%, #81c995 8%);
  border: 0;
  border-left: 1px solid color-mix(in srgb, #81c995 32%, var(--border-color-list));
  border-radius: 0;
  box-shadow: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #81c995;
    outline-offset: -2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.48;
  }
}

@media (max-width: 800px) {
  .article-nav-container.is-sticky::after {
    right: 3.67rem;
  }

  .nav-tabs.horizontal {
    padding-right: 3.67rem;
  }

  .article-overview-item.horizontal,
  .overview-select {
    min-height: 3.67rem;
  }

  .mobile-edit-toggle {
    width: 3.67rem;
  }
}
</style>
