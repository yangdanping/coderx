<template>
  <div class="detail-toc" v-if="titles.length">
    <!-- Desktop View -->
    <aside
      ref="desktopTocRef"
      :class="[
        'toc-desktop',
        'hidden-sm-and-down',
        {
          'is-expanded': isDesktopExpanded,
          'is-pinned': isPinnedOpen,
        },
      ]"
      aria-label="文章目录"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @focusin="handleFocusIn"
      @focusout="handleFocusOut"
    >
      <button
        ref="desktopToggleRef"
        type="button"
        class="toc-rail-toggle"
        aria-controls="detail-toc-panel"
        :aria-expanded="isDesktopExpanded"
        :aria-label="isPinnedOpen ? '取消固定目录' : '展开并固定目录'"
        @click="togglePinned"
      >
        <span class="visually-hidden">{{ isPinnedOpen ? '取消固定目录' : '展开并固定目录' }}</span>
        <span class="toc-rail" aria-hidden="true">
          <span
            v-for="item in titles"
            :key="item.id"
            :class="['toc-rail__tick', `level-${item.level}`, { active: activeId === item.id }]"
          ></span>
        </span>
      </button>

      <div id="detail-toc-panel" class="toc-panel" :aria-hidden="!isDesktopExpanded">
        <div class="toc-panel__header">
          <span class="toc-panel__title">目录</span>
          <span class="toc-panel__progress">{{ activePosition }} / {{ titles.length }}</span>
          <button
            type="button"
            class="toc-panel__toggle"
            :tabindex="isDesktopExpanded ? 0 : -1"
            :aria-label="isPinnedOpen ? '取消固定目录' : '固定目录'"
            :aria-pressed="isPinnedOpen"
            @click="togglePinned"
          >
            {{ isPinnedOpen ? '已固定' : '固定' }}
          </button>
        </div>

        <div class="toc-list-shell">
          <ul class="toc-list">
            <li v-for="item in titles" :key="item.id" :class="['toc-item', `level-${item.level}`, { active: activeId === item.id }]">
              <a
                class="toc-link"
                :href="`#${item.id}`"
                :aria-current="activeId === item.id ? 'location' : undefined"
                :tabindex="isDesktopExpanded ? 0 : -1"
                @click.prevent="scrollTo(item.id)"
              >
                {{ item.title }}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </aside>

    <!-- Mobile View -->
    <div class="toc-mobile hidden-md-and-up">
      <button
        type="button"
        class="toc-trigger"
        :class="{ 'is-active': showDrawer }"
        :aria-label="showDrawer ? '关闭目录' : '打开目录'"
        :aria-expanded="showDrawer"
        @click="showDrawer = true"
      >
        <ListTree :size="18" :stroke-width="2" class="toc-trigger__icon" />
        <!-- <span class="toc-trigger__label">目录</span> -->
      </button>
      <el-drawer v-model="showDrawer" title="目录" direction="rtl" size="60%">
        <ul class="toc-list-mobile">
          <li v-for="item in titles" :key="item.id" :class="['toc-item', `level-${item.level}`, { active: activeId === item.id }]" @click="handleMobileClick(item.id)">
            {{ item.title }}
          </li>
        </ul>
      </el-drawer>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { ListTree } from '@lucide/vue';

import type { DetailTocTitle } from './types/detail-toc.type';

const props = defineProps<{
  titles: DetailTocTitle[];
}>();

const showDrawer = ref(false);
const activeId = ref(props.titles[0]?.id ?? '');
const desktopTocRef = ref<HTMLElement | null>(null);
const desktopToggleRef = ref<HTMLButtonElement | null>(null);
const isHovered = ref(false);
const hasFocusWithin = ref(false);
const isPinnedOpen = ref(false);
const isDismissed = ref(false);
let isRestoringDismissedFocus = false;

const activeIndex = computed(() => props.titles.findIndex((item) => item.id === activeId.value));
const activePosition = computed(() => (activeIndex.value >= 0 ? activeIndex.value + 1 : 0));
const isDesktopExpanded = computed(() => !isDismissed.value && (isHovered.value || hasFocusWithin.value || isPinnedOpen.value));

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    activeId.value = id;
    // 减去头部导航的高度，避免遮挡
    const top = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({
      top,
      behavior: 'smooth',
    });
  }
};

const handleMobileClick = (id: string) => {
  scrollTo(id);
  showDrawer.value = false;
};

const handleMouseEnter = () => {
  isHovered.value = true;
  isDismissed.value = false;
};

const handleMouseLeave = () => {
  isHovered.value = false;
};

const handleFocusIn = () => {
  hasFocusWithin.value = true;
  if (!isRestoringDismissedFocus) {
    isDismissed.value = false;
  }
};

const handleFocusOut = (event: FocusEvent) => {
  const nextTarget = event.relatedTarget;
  if (!nextTarget || !desktopTocRef.value?.contains(nextTarget as Node)) {
    hasFocusWithin.value = false;
  }
};

const togglePinned = () => {
  isDismissed.value = false;
  isPinnedOpen.value = !isPinnedOpen.value;
};

const dismissDesktopToc = (restoreFocus = false) => {
  isPinnedOpen.value = false;
  isDismissed.value = true;

  if (!restoreFocus) return;

  isRestoringDismissedFocus = true;
  desktopToggleRef.value?.focus({ preventScroll: true });
  queueMicrotask(() => {
    isRestoringDismissedFocus = false;
  });
};

const handleOutsidePointerDown = (event: PointerEvent) => {
  const target = event.target;
  if (!(target instanceof Node) || desktopTocRef.value?.contains(target)) return;
  if (isDesktopExpanded.value || isPinnedOpen.value) {
    dismissDesktopToc();
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || (!isDesktopExpanded.value && !isPinnedOpen.value)) return;
  event.preventDefault();
  dismissDesktopToc(true);
};

// 监听滚动，高亮当前标题 (简单实现)
const handleScroll = () => {
  // 简单的滚动监听逻辑，找到当前视口中最接近顶部的标题
  // 实际项目中可能需要更复杂的 IntersectionObserver
  const scrollY = window.scrollY + 120; // 偏移量
  for (let i = props.titles.length - 1; i >= 0; i--) {
    const item = props.titles[i];
    if (!item) continue;
    const el = document.getElementById(item.id);
    if (el && el.offsetTop <= scrollY) {
      activeId.value = item.id;
      break;
    }
  }
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('keydown', handleKeydown);
  document.addEventListener('pointerdown', handleOutsidePointerDown);
  handleScroll();
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('pointerdown', handleOutsidePointerDown);
});
</script>

<style lang="scss" scoped>
.toc-desktop {
  --toc-accent-color: #81c995;
  --toc-muted-color: color-mix(in srgb, var(--text-secondary) 78%, var(--text-primary));

  position: relative;
  width: 100%;
  min-height: clamp(132px, 24vh, 220px);
  overflow: visible;
}

:where(html.dark) .toc-desktop {
  --toc-accent-color: #c0e0c7;
  --toc-muted-color: color-mix(in srgb, var(--text-secondary) 82%, var(--text-primary));
}

.toc-rail-toggle {
  position: relative;
  z-index: 2;
  display: inline-flex;
  width: 28px;
  min-height: clamp(132px, 24vh, 220px);
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--toc-muted-color);
  cursor: var(--cursorPointer);

  &:hover .toc-rail__tick,
  &:focus-visible .toc-rail__tick {
    opacity: 0.9;
  }

  &:focus-visible {
    outline: 2px solid var(--toc-accent-color);
    outline-offset: 2px;
  }
}

.toc-rail {
  display: flex;
  width: 24px;
  height: clamp(132px, 24vh, 220px);
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  overflow: hidden;
}

.toc-rail__tick {
  width: 13px;
  min-height: 1px;
  max-height: 2px;
  flex: 1 1 2px;
  align-self: center;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.48;
  transform: scaleX(1);
  transform-origin: center;
  transition:
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease,
    background-color 0.2s ease;

  &.level-2 {
    opacity: 0.35;
    transform: scaleX(0.7);
  }

  &.active {
    background: var(--toc-accent-color);
    opacity: 1;
    transform: scaleX(1.38);
  }
}

.toc-panel {
  position: absolute;
  z-index: 1;
  inset: 0 auto auto 0;
  width: 220px;
  box-sizing: border-box;
  padding: 12px 10px 12px 30px;
  border-radius: 10px;
  background: var(--el-bg-color-overlay, var(--el-bg-color));
  box-shadow: 0 4px 8px color-mix(in srgb, var(--text-primary) 10%, transparent);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translate3d(-8px, 0, 0);
  transition:
    opacity 0.18s ease,
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s linear 0.24s;
}

.toc-desktop.is-expanded .toc-panel {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translate3d(0, 0, 0);
  transition-delay: 0s;
}

.toc-panel__header {
  display: flex;
  min-height: 28px;
  align-items: center;
  gap: 7px;
  margin-bottom: 7px;
  padding-inline: 6px 2px;
}

.toc-panel__title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

.toc-panel__progress {
  margin-right: auto;
  color: var(--toc-muted-color);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.toc-panel__toggle {
  min-height: 24px;
  padding: 0 6px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--toc-muted-color);
  cursor: var(--cursorPointer);
  font-size: 11px;
  line-height: 1;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover,
  &[aria-pressed='true'] {
    background: color-mix(in srgb, var(--toc-accent-color) 12%, transparent);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--toc-accent-color);
    outline-offset: 1px;
  }
}

.toc-list-shell {
  max-height: min(60vh, 520px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: color-mix(in srgb, var(--toc-muted-color) 40%, transparent) transparent;
  scrollbar-width: thin;
}

.toc-list {
  list-style: none;
  margin: 0;
  padding: 0 3px 0 0;
}

.toc-item {
  position: relative;
  margin-block: 1px;
  color: var(--toc-muted-color);

  &.level-1 .toc-link {
    font-size: 14px;
    font-weight: 560;
  }

  &.level-2 .toc-link {
    padding-left: 18px;
  }
}

.toc-link {
  display: block;
  min-height: 30px;
  box-sizing: border-box;
  padding: 6px 8px;
  overflow: hidden;
  border-radius: 6px;
  color: inherit;
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: color-mix(in srgb, var(--text-primary) 5%, transparent);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--toc-accent-color);
    outline-offset: -2px;
  }
}

.toc-item.active::before {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 4px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--toc-accent-color);
  content: '';
  transform: translateY(-50%);
}

.toc-item.active .toc-link {
  display: -webkit-box;
  padding-left: 14px;
  overflow: hidden;
  color: var(--toc-accent-color);
  font-weight: 650;
  overflow-wrap: anywhere;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  margin: -1px;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .toc-panel,
  .toc-rail__tick,
  .toc-panel__toggle,
  .toc-link {
    transition: none;
  }
}

/* Mobile Styles */
//
// 与 AiAssistant 触发按钮保持同一设计语言:
//   - 玻璃拟态背景 (glass-effect) + 薄边 (thin-border), 融入详情页的柔和卡片视觉
//   - 同色系 mint 辉光阴影, 与 AI 助手按钮形成视觉呼应而不抢戏
//   - 保留 pill 形状, 通过 icon + 文案双信道传达"目录", 提升可识别性
//   - 使用 --cursorPointer 自定义光标, 与站内其它可点击元素统一
//
$toc-trigger-glow: #a3dfd0;

.toc-mobile {
  .toc-trigger {
    position: fixed;
    right: 20px;
    // AiAssistant pill 在 bottom: 20px, 约 40px 高 + 10px 间隙 → 目录按钮落在上方
    bottom: 76px;
    z-index: calc(var(--z-modal) - 1);

    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 6px;
    border: none;

    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    color: var(--text-primary);

    @include glass-effect;
    @include thin-border(all, var(--el-border-color-lighter));
    cursor: var(--cursorPointer);
    user-select: none;
    transition:
      transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.25s ease,
      color 0.2s ease;
    box-shadow:
      0 0 0 1px color-mix(in srgb, $toc-trigger-glow 55%, transparent),
      0 4px 12px color-mix(in srgb, $toc-trigger-glow 35%, transparent),
      0 1px 2px rgba(0, 0, 0, 0.06);

    &__icon {
      color: var(--el-color-primary);
      transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    &:hover {
      box-shadow:
        0 0 0 1px color-mix(in srgb, $toc-trigger-glow 70%, transparent),
        0 6px 18px color-mix(in srgb, $toc-trigger-glow 55%, transparent),
        0 2px 4px rgba(0, 0, 0, 0.08);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
    }
  }
}

.toc-list-mobile {
  --toc-accent-color: #81c995;
  list-style: none;
  padding: 0;

  .toc-item {
    padding: 12px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
    font-size: 16px;
    color: var(--text-primary);

    &.level-2 {
      padding-left: 20px;
      color: var(--text-secondary);
    }

    &.active {
      color: var(--toc-accent-color);
      font-weight: bold;
    }
  }
}

:where(html.dark) .toc-list-mobile {
  --toc-accent-color: #c0e0c7;
}

/* Element Plus Responsive Utility Classes Simulation */
/* Assuming project might have element-plus display classes, but adding backups just in case */
@media (max-width: 992px) {
  .hidden-sm-and-down {
    display: none !important;
  }
}

@media (min-width: 993px) {
  .hidden-md-and-up {
    display: none !important;
  }
}
</style>
