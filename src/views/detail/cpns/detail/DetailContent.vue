<template>
  <div class="detail-content">
    <el-skeleton :loading="showSkeleton" animated>
      <template #template>
        <DetailContentSkeleton />
      </template>

      <template #default>
        <template v-if="showArticleContent">
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
              <div ref="htmlContentRef" class="editor-content-view" v-dompurify-html="renderedContent"></div>
              <hr />
            </el-main>
          </el-container>
        </template>

        <div v-else class="detail-empty">
          文章内容暂时不可用，请稍后重试。
        </div>
      </template>
    </el-skeleton>

    <!-- 富文本图片-------------------------------------------------------- -->
    <el-image-viewer v-if="imgPreview.show" :url-list="imgPreview.imgs" :initial-index="imgPreview.index" @close="imgPreview.show = false" hide-on-click-modal />
  </div>
</template>

<script lang="ts" setup>
import { nextTick, computed } from 'vue';

import Avatar from '@/components/avatar/Avatar.vue';
import DetailContentSkeleton from './DetailContentSkeleton.vue';
import { resolveArticleDetailHtml } from '@/service/article/article.content';
import { ElImageViewer } from 'element-plus';
import MarkdownIt from 'markdown-it';
import { codeHeightlight, bindImagesLayer, renderCopyButtons, extractTocFromElement } from '@/utils';

import type { IArticle } from '@/stores/types/article.result';
import type { DetailTocTitle } from './types/detail-toc.type';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const props = withDefaults(
  defineProps<{
    article?: IArticle;
    status?: 'pending' | 'error' | 'success';
  }>(),
  {
    article: () => ({} as IArticle),
    status: 'pending',
  },
);

// 父级(Detail.vue)在外层 grid 的第 3 列渲染 DetailToc,
// 所以这里把 HTML 渲染后抽出的标题上抛.
const emit = defineEmits<{
  'update:toc': [titles: DetailTocTitle[]];
}>();

const article = computed(() => props.article);

/*
 * ======== 正文显示规则 ========
 * 1. skeleton 只认 query 的 pending 状态，避免 loading 布尔值和状态字符串重复表达同一件事。
 * 2. 真实正文只在 success 且 article.id 存在时渲染，避免半成品对象被误判成"已加载"。
 */
const showSkeleton = computed(() => props.status === 'pending');
const showArticleContent = computed(() => props.status === 'success' && !!article.value.id);

const renderedContent = computed(() => {
  const content = resolveArticleDetailHtml(article.value);
  // 如果已经是 HTML (包含 <p, <h, <div, <span 等标签)
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  if (isHtml) {
    return content;
  }
  // 否则尝试作为 Markdown 渲染
  return md.render(content);
});

const htmlContentRef = ref<null | HTMLElement>();

const imgPreview = reactive({
  img: '',
  imgs: [] as string[],
  show: false,
  index: 0,
});

const initContentProcessing = (el: HTMLElement) => {
  bindImagesLayer(el, imgPreview); //图片放大
  codeHeightlight(el); //代码高亮
  renderCopyButtons(el); // 挂载复制按钮

  // 提取标题生成目录, 通过 emit 交给父级渲染 DetailToc
  emit('update:toc', extractTocFromElement(el));
};

// 必须同时监听 DOM 挂载和内容变化，确保异步数据加载后能重新执行图片绑定和代码高亮等逻辑
watch(
  () => [htmlContentRef.value, renderedContent.value, showArticleContent.value],
  ([el, content, ready]) => {
    if (el && content && ready) {
      // 使用 nextTick 确保在 v-dompurify-html 完成渲染后再进行 DOM 后处理
      nextTick(() => initContentProcessing(el as HTMLElement));
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
@use '@/assets/css/detail-layout' as *;

// 本组件不再自己算"扣掉左右面板/TOC 的可用宽度",
// 外层 .detail-main grid 已经把正文列宽控制在 var(--detail-readable-max).
// 这里只负责填满所在的中间列 + 保留原有 padding-inline.
.detail-content {
  width: 100%;
  box-sizing: border-box;
  padding-inline: $detail-content-padding;

  .detail-empty {
    @include glass-effect;
    width: min(90%, 900px);
    margin: 0 auto;
    padding: 48px 32px;
    text-align: center;
    color: var(--text-secondary);
  }

  .el-main {
    @include glass-effect;

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

  @media (max-width: $detail-breakpoint-tablet) {
    padding-inline: 0;
  }
}
</style>
