<template>
  <div class="detail-content">
    <template v-if="Object.keys(article).length">
      <el-container>
        <el-main>
          <div class="author-info-block">
            <Avatar :size="90" :info="article.author ?? {}" />
            <div class="author-info-box">
              <h2>{{ article.author?.name ?? '佚名' }}</h2>
              <span v-dateformat="article.createAt">创建</span>
            </div>
          </div>
          <hr />
          <h1 class="article-title">{{ article.title }}</h1>
          <div ref="htmlContentRef" class="editor-content-view" v-dompurify-html="article.content"></div>
          <hr />
        </el-main>
      </el-container>
    </template>
    <template v-else>
      <el-skeleton animated />
    </template>
    <DetailPanel :article="article" />
    <!-- 富文本图片-------------------------------------------------------- -->
    <el-image-viewer v-if="imgPreview.show" :url-list="imgPreview.imgs" :initial-index="imgPreview.index" @close="imgPreview.show = false" hide-on-click-modal />
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import DetailPanel from './DetailPanel.vue';

import { ElImageViewer } from 'element-plus';
import type { IArticle } from '@/stores/types/article.result';
import { codeHeightlight, bindImagesLayer } from '@/utils';
import { render, h, nextTick } from 'vue';
import { CopyButton } from './CopyButton';
const { article = {} } = defineProps<{
  article?: IArticle;
}>();
const htmlContentRef = ref<null | HTMLElement>();

// 挂载复制按钮
const mountCopyButtons = () => {
  if (!htmlContentRef.value) return;
  // 查找所有 pre 标签
  const pres = htmlContentRef.value.querySelectorAll('pre');
  pres.forEach((pre) => {
    // 避免重复挂载
    if (pre.querySelector('.code-copy-btn')) return;

    // 设置相对定位
    pre.style.position = 'relative';

    // 获取代码文本
    const text = pre.innerText || pre.textContent || '';

    // 创建容器
    const container = document.createElement('div');
    pre.appendChild(container);

    // 渲染组件
    render(h(CopyButton, { text }), container);
  });
};

const imgPreview = reactive({
  img: '',
  imgs: [] as string[],
  show: false,
  index: 0,
});

watch(
  () => htmlContentRef.value,
  (newV) => {
    if (newV) {
      const el = newV as HTMLElement;
      bindImagesLayer(el, imgPreview); //图片放大
      codeHeightlight(el); //代码高亮
    }
  },
);

watch(
  () => [htmlContentRef.value, article.content],
  ([el]) => {
    if (el) {
      nextTick(mountCopyButtons); // 挂载复制按钮
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
@use '@/assets/css/editor';
.detail-content {
  margin-top: 80px;
  width: 80%;

  .el-main {
    backdrop-filter: blur(10px);
    .author-info-block {
      display: flex;
      align-items: center;
      .author-info-box {
        display: flex;
        flex-direction: column;
        height: 70px;
        justify-content: space-around;
        margin-left: 20px;
      }
    }
    .article-title {
      align-items: center;
      font-size: 50px;
      margin-bottom: 50px;
    }
  }
}

:deep(pre) {
  &:hover .code-copy-btn {
    display: flex;
  }
}

:deep(.code-copy-btn) {
  display: none;
  position: absolute;
  top: 8px;
  right: 8px;
  align-items: center;
  cursor: pointer;
  background-color: var(--el-bg-color-overlay, #ffffff);
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 4px;
  padding: 4px 8px;
  transition: all 0.3s;
  z-index: var(--z-content);

  &:hover {
    background-color: var(--el-fill-color-light, #f5f7fa);
    svg {
      color: var(--el-color-primary, #409eff);
    }
  }

  svg {
    font-size: 16px;
    color: var(--el-text-color-secondary, #909399);
  }
}

:deep(.copy-text) {
  font-size: 12px;
  margin-right: 6px;
  color: var(--el-color-success, #67c23a);
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
