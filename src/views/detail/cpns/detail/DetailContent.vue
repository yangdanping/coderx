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
import { codeHeightlight, bindImagesLayer, renderCopyButtons } from '@/utils';
import { nextTick, computed } from 'vue';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const { article = {} } = defineProps<{
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

watch(
  () => htmlContentRef.value,
  (newV) => {
    if (newV) {
      const el = newV as HTMLElement;
      bindImagesLayer(el, imgPreview); //图片放大
      codeHeightlight(el); //代码高亮

      // 提取标题生成目录
      const headers = el.querySelectorAll('h1, h2');
      tocTitles.value = Array.from(headers).map((header, index) => {
        const id = `article-header-${index}`;
        header.setAttribute('id', id);
        return {
          id,
          title: (header as HTMLElement).innerText,
          level: Number(header.tagName.substring(1)),
        };
      });
    }
  },
);

watch(
  () => [htmlContentRef.value, article.content],
  ([el]) => {
    if (el) {
      nextTick(() => renderCopyButtons(el as HTMLElement)); // 挂载复制按钮
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.detail-content {
  margin-top: 80px;
  width: 80%;

  .content-layout {
    display: flex;
    gap: 20px;

    .main-column {
      flex: 1;
      width: 0; // Prevent flex child from overflowing
    }

    .side-column {
      width: 250px;
      flex-shrink: 0;
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
    .content-layout {
      flex-direction: column;
      .side-column {
        display: none;
      }
      .main-column {
        width: 100%;
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
