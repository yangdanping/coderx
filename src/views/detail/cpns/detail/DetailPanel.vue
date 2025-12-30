<template>
  <div class="detail-panel">
    <Icon type="like" @click="likeClick(article.id)" :label="article.likes" :isActive="isArticleUserLiked(article.id)" :size="30" flex="column" :responsive="false" />
    <Icon type="comment" @click="gotoComment" :size="30" :label="article.commentCount" flex="column" :responsive="false" />
    <Icon type="views" :size="30" :label="article.views" flex="column" :responsive="false" />
    <Icon type="star" :isActive="isArticleUserCollected(article.id)" :size="30" ref="buttonRef" @click="onClickOutside" flex="column" :showLabel="false" :responsive="false" />
    <el-popover :disabled="disabled" ref="popoverRef" @after-leave="handleHide" :virtual-ref="buttonRef" trigger="click" width="400" virtual-triggering placement="right">
      <DetailCollect />
    </el-popover>
  </div>
</template>

<script lang="ts" setup>
import DetailCollect from './DetailCollect.vue';
import Icon from '@/components/icon/Icon.vue';

import { Msg, emitter } from '@/utils';

import type { IArticle } from '@/stores/types/article.result';
import type { ElPopover } from 'element-plus';

import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
// import useCommentStore from '@/stores/comment.store';

const userStore = useUserStore();
const rootStore = useRootStore();
// const commentStore = useCommentStore();
const articleStore = useArticleStore();
const { token } = storeToRefs(userStore);
const { isArticleUserLiked, isArticleUserCollected } = storeToRefs(articleStore);
// const { commentCount } = storeToRefs(commentStore);

const buttonRef = ref();
const popoverRef = ref();
const { article = {} } = defineProps<{
  article?: IArticle;
}>();

const disabled = ref(true);

onMounted(() => {
  disabled.value = token.value ? false : true;
});

const likeClick = (articleId) => {
  console.log('detail-panel likeClick', articleId);
  if (token.value) {
    if (article.status) {
      Msg.showFail('文章已被封禁,不可点赞');
    } else {
      articleStore.likeAction(articleId);
    }
  } else {
    Msg.showInfo('请先登录');
    rootStore.toggleLoginDialog();
  }
};

const gotoComment = () => emitter.emit('gotoCom');

const handleHide = () => emitter.emit('hideCollect');

const onClickOutside = () => {
  if (disabled.value && !token.value) {
    Msg.showInfo('请先登录');
    rootStore.toggleLoginDialog();
  } else {
    unref(popoverRef)?.popperRef?.delayHide?.();
  }
};
</script>

<style lang="scss" scoped>
.detail-panel {
  font-size: 30px;
  position: fixed;
  left: 2vw;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}
</style>
