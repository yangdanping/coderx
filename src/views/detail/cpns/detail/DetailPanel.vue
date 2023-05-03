<template>
  <div class="detail-panel">
    <i @click="likeClick(article.id)" class="like" :class="isArticleUserLiked(article.id)"></i>
    <span>{{ article.likes }}</span>
    <i class="comment" @click="gotoComment"></i>
    <span>{{ article.commentCount }}</span>
    <i class="views"></i>
    <span>{{ article.views }}</span>
    <!-- <el-popover @show="handleShow" @after-leave="handleHide" placement="right" width="400" trigger="click" :disabled="disabled"> -->
    <!-- <ArticleCollect /> -->
    <!-- <i class="el-icon-star collect" slot="reference" @click="showLogin">
        <el-icon><Star /></el-icon>
      </i> -->
    <!-- </el-popover> -->
  </div>
</template>

<script lang="ts" setup>
import { Msg, emitter } from '@/utils';

import { Star } from '@element-plus/icons-vue';

import type { IArticle } from '@/stores/types/article.result';

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
const userStore = useUserStore();
const rootStore = useRootStore();
const { token, userInfo } = storeToRefs(userStore);
const { isArticleUserLiked } = storeToRefs(useArticleStore());

const props = defineProps({
  article: {
    type: Object as PropType<IArticle>,
    default: () => {}
  }
});

const disabled = ref(true);

const likeClick = (articleId) => {
  console.log('likeClick', articleId);
};
const gotoComment = () => emitter.emit('gotoCom');
const handleShow = () => userStore.getCollectAction(userInfo.value.id);
const handleHide = () => emitter.emit('hideCollect');
const showLogin = () => {
  if (disabled.value && !token.value) {
    Msg.showInfo('请先登录');
    rootStore.changeLoginDialog();
  }
};
</script>

<style lang="scss" scoped>
.detail-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 30px;
  position: fixed;
  left: 2vw;
  top: 240px;
  // position: fixed;
  // top: 100px;
  // left: -20px;
  // left: calc((100vw - 1000px) / 2 - 400px);

  .like,
  .comment,
  .views {
    width: 35px;
    height: 35px;
    background-size: contain;
    cursor: pointer;
  }
  .collect {
    font-size: 35px;
    color: #4e5969;
    cursor: pointer;
  }
  .like {
    background-image: url('@/assets/img/article/like.png');
  }
  .comment {
    background-image: url('@/assets/img/article/comment.png');
  }
  .views {
    background-image: url('@/assets/img/article/view.png');
  }

  .like:hover {
    background-image: url('@/assets/img/article/like-active.png');
  }
  .comment:hover {
    background-image: url('@/assets/img/article/comment-active.png');
  }
  .like:hover,
  .comment:hover {
    span {
      color: #81c995;
    }
  }
  span {
    font-size: 15px;
  }
}
.liked {
  background-image: url('@/assets/img/article/like-active.png') !important;
  color: #81c995 !important;
}
</style>
