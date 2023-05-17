<template>
  <div class="detail-panel">
    <Icon @click="likeClick(article.id)" type="like" :label="article.likes" :isActive="isArticleUserLiked(article.id)" :size="40" flex="column" />
    <Icon @click="gotoComment" type="comment" :size="40" :label="commentCount" flex="column" />
    <Icon type="views" :size="40" :label="article.views" flex="column" />
    <Icon type="star" :size="40" ref="buttonRef" @click="onClickOutside" flex="column" />
    <el-popover
      :disabled="disabled"
      ref="popoverRef"
      @show="handleShow"
      @after-leave="handleHide"
      :virtual-ref="buttonRef"
      trigger="click"
      width="400"
      virtual-triggering
      placement="right"
    >
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

import useRootStore from '@/stores';
import useUserStore from '@/stores/user';
import useArticleStore from '@/stores/article';
import useCommentStore from '@/stores/comment';
const userStore = useUserStore();
const rootStore = useRootStore();
const commentStore = useCommentStore();
const articleStore = useArticleStore();
const { token, userInfo } = storeToRefs(userStore);
const { isArticleUserLiked } = storeToRefs(articleStore);
const { commentCount } = storeToRefs(commentStore);

const buttonRef = ref();
const popoverRef = ref();
const props = defineProps({
  article: {
    type: Object as PropType<IArticle>,
    default: () => {}
  }
});

const disabled = ref(true);

onMounted(() => {
  disabled.value = token.value ? false : true;
});

const likeClick = (articleId) => {
  console.log('likeClick', articleId);
  if (token.value) {
    if (props.article.status === '1') {
      Msg.showFail('文章已被封禁,不可点赞');
    } else {
      articleStore.likeAction(articleId);
    }
  } else {
    Msg.showInfo('请先登录');
    rootStore.changeLoginDialog();
  }
};
const gotoComment = () => emitter.emit('gotoCom');
const handleShow = (e) => {
  console.log('handleShowhandleShowhandleShowhandleShowhandleShow', e);
  if (!disabled.value) {
    userStore.getCollectAction(userInfo.value.id);
  }
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
  /* display: flex;
  flex-direction: column;
  align-items: left;
  justify-content: space-around; */
  font-size: 30px;
  position: fixed;
  left: 2vw;
  top: 240px;
  > div {
    cursor: pointer;
    margin-top: 5px;
  }
}
</style>
