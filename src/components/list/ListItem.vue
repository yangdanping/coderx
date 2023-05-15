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
      <img v-if="item.cover" class="cover" :src="item.cover[0]" />
      <div v-else class="cover"></div>
    </a>
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import { emitter } from '@/utils';
import type { IArticle } from '@/stores/types/article.result';
import type { IComment } from '@/stores/types/comment.result';

const router = useRouter();

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
const goDetail = (item: IArticle & IComment) => {
  if (!props.isComment) {
    console.log('文章列表中点击', item.id);
    router.push({ path: `/article/${item.id}` });
  } else {
    console.log('用户评论列表中点击', item.article?.id);
    router.push({ path: `/article/${item.article?.id}` });
  }
};
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
      .title {
        font-weight: 700;
        font-size: 24px;
      }
      .abstract {
        height: 30px;
        width: 800px;
        margin-top: 10px;
        white-space: nowrap;
        color: #777;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    .cover {
      width: 170px;
      height: 100%;
      object-fit: cover;
      border-radius: 5px;
      overflow: hidden;
      cursor: pointer;
    }
  }
}
</style>
