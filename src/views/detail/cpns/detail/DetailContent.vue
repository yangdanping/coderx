<template>
  <div class="detail-content">
    <template v-if="Object.keys(article).length">
      <el-container>
        <el-main>
          <div class="author-info-block">
            <Avatar :size="90" :info="article.author ?? {}" />
            <div class="author-info-box">
              <h2>{{ article.author?.name ?? '佚名' }}</h2>
              <span>{{ article.createAt }}创建</span>
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
    <div class="img-preview" v-show="imgPreview.show">
      <el-image
        ref="imageRef"
        :preview-src-list="imgPreview.imgs"
        :src="imgPreview.imgs[imgPreview.index]"
        :initial-index="imgPreview.index"
        fit="cover"
        hide-on-click-modal
        @close="imgPreview.show = false"
      ></el-image>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import DetailPanel from './DetailPanel.vue';

import type { ElImage } from 'element-plus';
import type { IArticle } from '@/stores/types/article.result';
import { codeHeightlight, bindImagesLayer } from '@/utils';
defineProps({
  article: {
    type: Object as PropType<IArticle>,
    default: () => {}
  }
});
const imageRef = ref<InstanceType<typeof ElImage>>();
const htmlContentRef = ref<null | HTMLElement>();

const imgPreview = reactive({
  img: '',
  imgs: [] as any[],
  show: false,
  index: 0
});

watch(
  () => htmlContentRef.value,
  (newV) => {
    newV && bindImagesLayer(newV, imgPreview); //图片放大
    newV && codeHeightlight(newV); //代码高亮
  }
);
</script>

<style lang="scss" scoped>
@import '@/assets/css/editor';
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

.img-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  backdrop-filter: blur(10px);
  z-index: 999;
  :deep(.el-image__preview) {
    display: none;
  }
}
</style>
