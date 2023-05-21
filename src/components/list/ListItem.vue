<template>
  <div class="list-item">
    <div class="author">
      <Avatar v-if="showAvatar" :info="item.author" :src="item.author?.avatarUrl" />
      <div class="author-info">
        <span>{{ item.author?.name }}</span>
        <span>{{ item.createAt }}</span>
      </div>
      <el-tag v-for="tag in item.tags" size="small" :key="tag.name" @click="goTag(tag)" type="success">{{ tag.name }}</el-tag>
    </div>
    <a class="content-wrapper" :href="item.articleUrl" @click.stop.prevent="goDetail(item)">
      <div class="content">
        <div class="title">{{ !isComment ? item.title : item.article?.title }}</div>
        <p class="abstract">{{ item.content }}</p>
        <slot name="action"></slot>
      </div>
      <img v-if="item.cover" class="cover" :src="item.cover" />
      <div v-else class="cover"></div>
    </a>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import { emitter } from '@/utils';
import type { IArticle } from '@/stores/types/article.result';
import type { IComment } from '@/stores/types/comment.result';

const props = defineProps({
  item: {
    type: Object as PropType<IArticle & IComment>,
    default: () => {}
  },
  isComment: {
    type: Boolean,
    default: false
  },
  showAvatar: {
    type: Boolean,
    default: true
  }
});
const goDetail = (item: IArticle & IComment) => window.open(item.articleUrl);
const goTag = (tag) => emitter.emit('changeTag', tag);
</script>

<style lang="scss" scoped>
.list-item {
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  padding: 20px 10px 0;
  margin-bottom: 10px;
  border-radius: 10px;
  color: var(--fontColor);

  &:hover {
    transform: scale(1.01);
    box-shadow: 3px 3px 8px rgba(100, 100, 100, 0.7);
  }

  .author {
    display: flex;
    align-items: center;
    span {
      margin-right: 10px;
    }
    .el-tag {
      cursor: pointer;
    }
    .author-info {
      display: flex;
      align-items: center;
      margin-left: 15px;
    }
  }

  .content-wrapper {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #e5e6eb;
    padding-bottom: 10px;
    cursor: pointer;
    .content {
      margin-top: 10px;
      .title,
      .abstract {
        width: 800px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .title {
        font-weight: 700;
        font-size: 24px;
      }
      .abstract {
        height: 30px;
        margin-top: 10px;
        color: #777;
      }
    }
    .cover {
      width: 170px;
      height: 100px;
      object-fit: cover; //保持原来宽高比,遮盖整个区域
      border-radius: 5px;
      overflow: hidden;
      cursor: pointer;
    }
  }
}
</style>
