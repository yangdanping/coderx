<template>
  <div class="detail-toc" v-if="titles.length">
    <!-- Desktop View -->
    <div class="toc-desktop hidden-sm-and-down">
      <div class="toc-title">目录</div>
      <ul class="toc-list">
        <li v-for="item in titles" :key="item.id" :class="['toc-item', `level-${item.level}`, { active: activeId === item.id }]" @click="scrollTo(item.id)">
          {{ item.title }}
        </li>
      </ul>
    </div>

    <!-- Mobile View -->
    <div class="toc-mobile hidden-md-and-up">
      <div class="toc-trigger" @click="showDrawer = true">
        <el-icon><List /></el-icon>
      </div>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { List } from '@element-plus/icons-vue';

interface Title {
  id: string;
  title: string;
  level: number;
}

const props = defineProps<{
  titles: Title[];
}>();

const showDrawer = ref(false);
const activeId = ref('');

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
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style lang="scss" scoped>
.detail-toc {
  /* 使得组件不影响文档流，但内部定位基于视口 */
  height: 100%;
}

/* Desktop Styles */
.toc-desktop {
  position: sticky;
  top: 80px;
  width: 100%;
  @include glass-effect-popup;
  padding: 20px;
  border-radius: 6px;
  box-shadow: var(--el-box-shadow-light);
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  transition: all 0.3s ease;
  z-index: 10;
  border: 1px solid var(--el-border-color-lighter);

  .toc-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    color: var(--text-primary);
  }
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;

  .toc-item {
    cursor: pointer;
    padding: 8px 10px;
    font-size: 14px;
    color: var(--text-secondary);
    border-radius: 4px;
    transition: all 0.2s;
    line-height: 1.4;

    &:hover {
      background-color: var(--el-fill-color-light);
      color: var(--el-color-primary);
    }

    &.active {
      color: var(--el-color-primary);
      font-weight: bold;
      background-color: var(--el-color-primary-light-9);
    }

    &.level-1 {
      font-weight: 600;
    }

    &.level-2 {
      padding-left: 20px;
      font-size: 13px;
    }
  }
}

/* Mobile Styles */
.toc-mobile {
  .toc-trigger {
    position: fixed;
    right: 20px;
    bottom: 100px; /* 放在右下角，避免遮挡主要内容 */
    width: 44px;
    height: 44px;
    background: var(--el-color-primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    z-index: 100;
    font-size: 20px;
  }
}

.toc-list-mobile {
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
      color: var(--el-color-primary);
      font-weight: bold;
    }
  }
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
