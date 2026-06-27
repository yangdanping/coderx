<template>
  <div class="detail-toc" v-if="titles.length">
    <!-- Desktop View -->
    <div class="toc-desktop hidden-sm-and-down">
      <div class="toc-title">目录</div>
      <div class="toc-list-shell" :style="tocSliderStyle">
        <span class="toc-active-slider" aria-hidden="true"></span>
        <ul class="toc-list">
          <li v-for="item in titles" :key="item.id" :class="['toc-item', `level-${item.level}`, { active: activeId === item.id }]" @click="scrollTo(item.id)">
            {{ item.title }}
          </li>
        </ul>
      </div>
    </div>

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

const TOC_ITEM_HEIGHT = 40;

const showDrawer = ref(false);
const activeId = ref(props.titles[0]?.id ?? '');

const activeIndex = computed(() => props.titles.findIndex((item) => item.id === activeId.value));
const tocSliderStyle = computed(() => {
  const index = activeIndex.value >= 0 ? activeIndex.value : 0;

  return {
    '--toc-active-y': `${index * TOC_ITEM_HEIGHT}px`,
    '--toc-active-opacity': activeIndex.value >= 0 ? '1' : '0',
  };
});

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
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
  window.addEventListener('scroll', handleScroll);
  handleScroll();
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style lang="scss" scoped>
.toc-desktop {
  width: 100%;
  padding: 6px 0;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 10;

  .toc-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 18px;
    padding-left: 20px;
    color: var(--text-primary);
  }
}

.toc-list-shell {
  --toc-accent-color: #81c995;
  --toc-muted-color: color-mix(in srgb, var(--text-secondary) 68%, #9a9a9a);
  --toc-active-y: 0px;
  --toc-active-opacity: 0;
  position: relative;
  overflow-x: hidden;
}

:where(html.dark) .toc-list-shell {
  --toc-accent-color: #c0e0c7;
}

.toc-active-slider {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 40px;
  border-radius: 0;
  background: var(--toc-accent-color);
  opacity: var(--toc-active-opacity);
  pointer-events: none;
  transform: translate3d(0, var(--toc-active-y), 0);
  transition:
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.18s ease,
    background-position 0.34s ease;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;

  .toc-item {
    display: flex;
    align-items: center;
    min-height: 40px;
    box-sizing: border-box;
    cursor: pointer;
    padding: 0 10px 0 20px;
    font-size: 15px;
    color: var(--toc-muted-color);
    line-height: 1.4;
    transition:
      color 0.22s cubic-bezier(0.22, 1, 0.36, 1);

    &:hover {
      color: var(--text-primary);
    }

    &.active {
      color: var(--toc-accent-color);
      font-weight: bold;
    }

    &.level-1 {
      font-weight: 600;
    }

    &.level-2 {
      padding-left: 32px;
      font-size: 14px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .toc-active-slider,
  .toc-list .toc-item {
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

    &__label {
      background: linear-gradient(to right, #00ffbb, #6ec2c4);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
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
