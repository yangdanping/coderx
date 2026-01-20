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
      <div class="cover" role="button">
        <img v-if="item.cover" :src="item.cover" loading="lazy" />
        <div class="multiple-action">
          <slot name="multiple-action"></slot>
        </div>
      </div>
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
const goTag = throttle((tag) => emitter.emit('changeTagInList', tag), 300);
</script>

<style lang="scss" scoped>
.list-item {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 30px 10px 0;
  margin-bottom: 10px;
  z-index: var(--z-elevated);
  // 防止内容溢出
  overflow: hidden;
  box-sizing: border-box;

  // ~ ："兄弟选择器" ,作用是：匹配后面跟随的所有同级（兄弟）元素
  // & ~ & ：匹配后面跟随的所有同级（兄弟）元素,一般用于重置后续项,也是目前css"模拟 :first-of-class"方案
  // 等价于 .list-item ~ .list-item { ... }
  & ~ & {
    padding-top: 10px;
  }

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
    z-index: var(--z-base);
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
    flex-wrap: wrap; // 允许标签换行
    gap: 6px 0; // 换行时的垂直间距
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
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
    cursor: pointer;
    // 防止溢出
    min-width: 0;

    .content {
      flex: 1;
      margin-top: 5px;
      // 🌟关键：允许内容收缩
      min-width: 0;
      overflow: hidden;

      .title,
      .abstract {
        // 改为 100% 宽度自适应容器，而非固定 clamp
        width: 100%;
        padding-bottom: 5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .abstract {
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
      }
    }
  }

  /**
   * 响应式布局总结：
   * 1. 平板端 (max-width: 768px): 
   *    - 缩小封面图尺寸 (120x75)，减小左间距，释放空间给文字。
   * 2. 移动端 (max-width: 480px): 
   *    - 隐藏封面图，让文字内容占据 100% 宽度。
   *    - 减小整体内边距 (padding) 和外边距 (margin)，适配窄屏。
   *    - 调小标题、摘要和作者信息的字体大小，优化阅读体验。
   *    - 调整作者信息间距。
   */

  // 平板端
  @media (max-width: 768px) {
    .content-wrapper .cover {
      width: 120px;
      height: 75px;
      margin-left: 16px;
    }
  }

  // 移动端
  @media (max-width: 480px) {
    padding: 20px 8px 0;
    margin-bottom: 8px;

    .author .author-info {
      margin-left: 10px;
      font-size: 13px;
    }

    .content-wrapper {
      .content {
        .title {
          font-size: 16px;
        }
        .abstract {
          font-size: 13px;
        }
      }
      .cover {
        display: none;
      }
    }
  }
}
</style>
