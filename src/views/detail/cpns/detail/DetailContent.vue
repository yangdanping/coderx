<template>
  <div class="detail-content">
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
        <div class="editor-content-view" v-html="article.content"></div>
        <hr />
      </el-main>
    </el-container>
    <!-- <DetailPanel :article="article" /> -->
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import Avatar from '@/components/avatar/Avatar.vue';
import { ElContainer, ElMain } from 'element-plus';
defineProps({
  article: {
    type: Object,
    default: () => {}
  }
});
</script>

<style lang="scss" scoped>
@import '../../assets/css/editor.scss';
.detail-content {
  margin-top: 80px;
  width: 80%;
  .el-main {
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
