<template>
  <div class="list-item">
    <div class="checkbox">
      <slot name="checkbox"> </slot>
    </div>
    <div class="author">
      <Avatar v-if="showAvatar" :info="item.author" :src="item.author?.avatarUrl" />
      <div class="author-info">
        <span>{{ item.author?.name }}</span>
        <span v-dateformat="item.createAt"></span>
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
        <div class="multiple-action">
          <slot name="multiple-action"></slot>
        </div>
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
import { useRouter } from 'vue-router';

const router = useRouter();

/** 列表项数据类型 - 兼容文章和评论的通用属性 */
interface IListItemData {
  id?: number;
  title?: string;
  content?: string;
  articleUrl?: string;
  author?: { id?: number; name?: string; avatarUrl?: string | null };
  cover?: string;
  tags?: { name?: string }[];
  createAt?: string;
  article?: IArticle; // 评论关联的文章
}

const { isComment = false, showAvatar = true } = defineProps<{
  item: IListItemData;
  isComment?: boolean;
  showAvatar?: boolean;
}>();

const goDetail = (item: IListItemData) => {
  const articleId = isComment ? item.article?.id : item.id;
  const routeUrl = router.resolve({ name: 'detail', params: { articleId } });
  window.open(routeUrl.href, '_blank'); // routeUrl.href 是相对路径article/:id
  // 当在 http://192.168.3.96:8080/article 访问id为123的文章时 会打开 http://192.168.3.96:8080/article/123
};
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
  color: var(--fontColor);
  z-index: 99;

  .checkbox {
    position: absolute;
    left: -13px;
    top: 50%;
    transform: translateY(-50%);
  }
  // 动态下划线
  &::after {
    content: '';
    position: absolute;
    left: 0px;
    bottom: 0px;
    z-index: 0;
    height: 1.5px;
    width: 100%;
    background: linear-gradient(90deg, #43c3ff, #afffe3);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.5s ease-out;
  }
  &:hover::after {
    transform: scaleX(1);
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
      position: relative;
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
      .multiple-action {
        position: absolute;
        right: 5px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 100;
      }
    }
  }
}
</style>
