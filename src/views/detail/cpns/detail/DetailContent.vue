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
import { codeHeightlight, bindImagesLayer, renderCopyButtons } from '@/utils';
import { nextTick } from 'vue';
const { article = {} } = defineProps<{
  article?: IArticle;
}>();
const htmlContentRef = ref<null | HTMLElement>();

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
</style>
