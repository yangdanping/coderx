<template>
  <div class="list-item">
    <div class="checkbox">
      <slot name="checkbox"> </slot>
    </div>
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
        <h2 class="title">{{ !isComment ? item.title : item.article?.title }}</h2>
        <p class="abstract">{{ item.content }}</p>
        <slot name="action"></slot>
      </div>
      <div class="cover">
        <img v-if="item.cover" :src="item.cover" loading="lazy" />
      </div>
      <!-- <img v-if="item.cover" class="cover" :src="item.cover" loading="lazy" />
      <div v-else class="cover"></div> -->
    </a>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import { emitter, throttle } from '@/utils';

import type { IArticle } from '@/stores/types/article.result';
import type { IComment } from '@/stores/types/comment.result';

const props = defineProps({
  item: {
    type: Object as PropType<IArticle & IComment>,
    default: () => {},
  },
  isComment: {
    type: Boolean,
    default: false,
  },
  showAvatar: {
    type: Boolean,
    default: true,
  },
});
const goDetail = (item: IArticle & IComment) => window.open(item.articleUrl);
// const goTag = (tag) => emitter.emit('changeTagInList', tag);
const goTag = throttle(function (tag) {
  emitter.emit('changeTagInList', tag);
}, 300);
</script>

<style lang="scss" scoped>
.list-item {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 0 10px;
  margin-bottom: 10px;
  border-radius: 10px;
  transition: all 0.3s;
  color: var(--fontColor);
  z-index: 99;
  /* width: 80%; */

  .checkbox {
    position: absolute;
    left: -13px;
    top: 50%;
    transform: translateY(-50%);
  }

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
      flex: 1 1 auto;
      margin-top: 5px;
      .title,
      .abstract {
        width: 600px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .abstract {
        /* width: 30%; */
        color: #999;
      }
    }

    .cover {
      flex: 0 0 auto;
      width: 170px;
      height: 100px;
      border-radius: 8px;
      margin-left: 24px;
      overflow: hidden;
      cursor: pointer;
      img {
        object-fit: cover; //保持原来宽高比,遮盖整个区域
        width: 100%;
        height: 100%;
      }
    }
  }
}
</style>
