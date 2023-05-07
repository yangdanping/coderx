<template>
  <div class="detail-panel">
    <i @click="likeClick(article.id)" class="like" :class="isArticleUserLiked(article.id)"></i>
    <span>{{ article.likes }}</span>
    <i class="comment" @click="gotoComment"></i>
    <span>{{ article.commentCount }}</span>
    <i class="views"></i>
    <span>{{ article.views }}</span>
    <i class="el-icon-star collect" ref="buttonRef" v-click-outside="onClickOutside">
      <el-icon><Star /></el-icon>
    </i>
    <el-popover ref="popoverRef" @show="handleShow" @after-leave="handleHide" :virtual-ref="buttonRef" trigger="click" width="400" virtual-triggering placement="right">
      <DetailCollect />
    </el-popover>
  </div>
</template>

<script lang="ts" setup>
import { Msg, emitter } from '@/utils';

import { Star } from '@element-plus/icons-vue';
import DetailCollect from './DetailCollect.vue';
import { ClickOutside as vClickOutside } from 'element-plus';
import type { IArticle } from '@/stores/types/article.result';
import type { ElPopover } from 'element-plus';

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
const userStore = useUserStore();
const rootStore = useRootStore();
const buttonRef = ref();
const popoverRef = ref();
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
const handleShow = () => {
  console.log('handleShowhandleShowhandleShowhandleShowhandleShow');
  userStore.getCollectAction(userInfo.value.id);
};
const handleHide = () => emitter.emit('hideCollect');
const onClickOutside = () => {
  if (disabled.value && !token.value) {
    Msg.showInfo('请先登录');
    rootStore.changeLoginDialog();
  } else {
    unref(popoverRef)?.popperRef?.delayHide?.();
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
