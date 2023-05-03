<template>
  <div class="article-list-item">
    <div class="article-author">
      <Avatar :info="item.author" :src="item.author?.avatarUrl" />
      <div class="author-info-box">
        <span class="name">{{ item.author?.name }}</span>
        <span>{{ item.createAt }}</span>
      </div>
      <el-tag v-for="tag in item.tags" size="small" :key="tag.name" @click="goTag(tag)" type="success">{{ tag.name }}</el-tag>
    </div>
    <div class="content-wrapper">
      <div class="content-main">
        <div class="content" @click="goDetail(item)">
          <a class="title">{{ item.title }}</a>
          <p class="abstract">{{ item.content }}</p>
        </div>
        <ArticleAction :article="item" />
      </div>
      <img v-if="item.cover" @click="goDetail(item)" :src="item.cover[0]" />
      <div v-else style="width: 170px; height: 120px"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import ArticleAction from './ArticleAction.vue';
import { emitter } from '@/utils';

import type { IArticle } from '@/stores/types/article.result';

const router = useRouter();

defineProps({
  item: {
    type: Object as PropType<IArticle>,
    default: () => {}
  }
});
const goDetail = ({ id }: IArticle) => {
  console.log('goDetail', id);
  router.push({ path: `/article/${id}` });
};
const goTag = (tag) => emitter.emit('changeTag', tag);
</script>

<style lang="scss" scoped>
.article-list-item {
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  padding: 20px 10px 0;
  margin-bottom: 10px;
  border-radius: 10px;
  .article-author {
    display: flex;
    align-items: center;
    span {
      margin-right: 10px;
    }
    .el-tag {
      cursor: pointer;
    }
    .author-info-box {
      display: flex;
      align-items: center;
      margin-left: 15px;
      span {
        color: var(--fc);
      }
    }
  }

  .content-wrapper {
    display: flex;
    border-bottom: 1px solid #e5e6eb;
    padding-bottom: 10px;
    .content-main {
      margin-top: 10px;
      cursor: pointer;
      .content {
        .title {
          font-weight: 700;
          font-size: 24px;
        }
        .abstract {
          height: 30px;
          width: 800px;
          padding: 15px 0;
          white-space: nowrap;
          color: #777;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
    img {
      width: 170px;
      height: 100%;
      object-fit: cover;
      border-radius: 5px;
      overflow: hidden;
      cursor: pointer;
    }
  }
}
.article-list-item:hover {
  transform: scale(1.01);
  box-shadow: 3px 3px 8px rgba(100, 100, 100, 0.7);
}
</style>
