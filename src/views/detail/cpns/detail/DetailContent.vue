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
import { emitter } from '@/utils';

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
    newV && bindImagesLayer();
  }
);
// 该函数将v-html中的图片拿到存入imgPreview.imgs中供el-image使用
// 每张图片绑定点击事件,得到下标值在el-image中显示
const bindImagesLayer = () => {
  const content = htmlContentRef.value;
  const imgs = [].slice.call(content?.querySelectorAll('img'));
  if (imgs?.length) {
    imgs.forEach((item: HTMLImageElement, index) => {
      item.classList.add('medium-zoom-image'); //为图片添加样式
      const src = item.getAttribute('src');
      if (!imgPreview.imgs.includes(src)) {
        imgPreview.imgs?.push(src);
      }
      item.addEventListener('click', () => {
        imgPreview.show = !imgPreview.show;
        // imgPreview.img = src!;
        imgPreview.index = index;
        document.querySelector('.img-preview')?.querySelector('img')?.click(); //手动控制el-image图片的点击
      });
    });
  }

  console.log('imgsvimgs', imgPreview.imgs);
};
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
  z-index: 9999;
  :deep(.el-image__preview) {
    display: none;
  }
}
</style>
