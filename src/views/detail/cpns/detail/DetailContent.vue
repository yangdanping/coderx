<template>
  <div class="detail-content">
    <template v-if="Object.keys(article).length">
      <div class="content-layout">
        <div class="main-column">
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
        </div>
        <div class="side-column hidden-sm-and-down" v-if="tocTitles.length">
          <DetailToc :titles="tocTitles" />
        </div>
      </div>
    </template>
    <template v-else>
      <el-skeleton animated />
    </template>
    <DetailPanel :article="article" />
    <div class="hidden-md-and-up" v-if="tocTitles.length">
      <DetailToc :titles="tocTitles" />
    </div>
    <!-- 富文本图片-------------------------------------------------------- -->
    <el-image-viewer v-if="imgPreview.show" :url-list="imgPreview.imgs" :initial-index="imgPreview.index" @close="imgPreview.show = false" hide-on-click-modal />
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import DetailPanel from './DetailPanel.vue';
import DetailToc from './DetailToc.vue';

import { ElImageViewer } from 'element-plus';
import MarkdownIt from 'markdown-it';
import type { IArticle } from '@/stores/types/article.result';
import { codeHeightlight, bindImagesLayer, renderCopyButtons, extractTocFromElement } from '@/utils';
import { nextTick, computed } from 'vue';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const { article = {} as IArticle } = defineProps<{
  article?: IArticle;
}>();

const renderedContent = computed(() => {
  const content = article.content || '';
  // 如果已经是 HTML (包含 <p, <h, <div, <span 等标签)
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  if (isHtml) {
    return content;
  }
  // 否则尝试作为 Markdown 渲染
  return md.render(content);
});

const htmlContentRef = ref<null | HTMLElement>();
const tocTitles = ref<{ id: string; title: string; level: number }[]>([]);

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

  // 提取标题生成目录
  tocTitles.value = extractTocFromElement(el);
};

// 必须同时监听 DOM 挂载和内容变化，确保异步数据加载后能重新执行图片绑定和代码高亮等逻辑
watch(
  () => [htmlContentRef.value, article.content],
  ([el, content]) => {
    if (el && content) {
      // 使用 nextTick 确保在 v-dompurify-html 完成渲染后再进行 DOM 后处理
      nextTick(() => initContentProcessing(el as HTMLElement));
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
$layout-gap: 20px;
$side-column-width: 220px;
$detail-content-padding: 24px;
$main-column-max-width: min(1100px, 60vw, calc(100vw - (#{$side-column-width} * 2) - (#{$layout-gap} * 2) - (#{$detail-content-padding} * 2)));

.detail-content {
  // 桌面端使用三列网格：左侧留白、正文、右侧目录。
  // 左右两列等宽，可以保证中间正文严格相对整个页面居中。
  // 这里用 min() 取三个“上限”里的最小值：
  // 1) 1100px：正文的绝对最大宽度
  // 2) 60vw：正文随视口缩放的相对宽度上限
  // 3) calc(...)：扣除左右留白、目录和间距后，当前视口真正还能分给正文的最大宽度
  // 这个场景核心是在多个上限里选更保守的那个，所以 min() 比 clamp() 更直接。
  // clamp(min, preferred, max) 更适合“给一个最小值 + 理想值 + 最大值”的连续区间约束。
  // max() 则是取多个值中的最大值，常用于设置下限；和这里“限制别太宽”的目标相反。
  margin-top: 80px;
  width: 100%;
  box-sizing: border-box;
  padding-inline: $detail-content-padding;

  .content-layout {
    display: grid;
    grid-template-columns: $side-column-width minmax(0, $main-column-max-width) $side-column-width;
    justify-content: center;
    align-items: start;
    column-gap: $layout-gap;

    .main-column {
      grid-column: 2;
      min-width: 0;
    }

    .side-column {
      grid-column: 3;
      width: $side-column-width;
      min-width: 0;
    }
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

  /* Responsive Utilities */
  @media (max-width: 992px) {
    .hidden-sm-and-down {
      display: none !important;
    }
    // 小屏下退回单列布局，目录隐藏，正文单独居中。
    .content-layout {
      display: block;
      .side-column {
        display: none;
      }
      .main-column {
        width: min(90%, 1000px);
        margin: 0 auto;
      }
    }
  }

  @media (min-width: 993px) {
    .hidden-md-and-up {
      display: none !important;
    }
  }
}
</style>
