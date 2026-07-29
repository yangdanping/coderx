<template>
  <div class="detail-panel">
    <Icon type="like" @click="likeClick(article.id)" :label="article.likes" :isActive="article.id ? isLiked(article.id) : false" :size="30" flex="column" :responsive="false" />
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
import debounce from '@/utils/debounce';
import { Msg, emitter } from '@/utils';
import useRootStore from '@/stores/index.store';
import useUserStore from '@/stores/user.store';
import useArticleStore from '@/stores/article.store';
import { useLikeArticle, useUserLikedArticles } from '@/composables/useArticleList';

import type { IArticle } from '@/stores/types/article.result';
import type { ElPopover } from 'element-plus';
// import useCommentStore from '@/stores/comment.store';

const { article = {} } = defineProps<{
  article?: IArticle;
}>();

const userStore = useUserStore();
const rootStore = useRootStore();
// const commentStore = useCommentStore();
const articleStore = useArticleStore();
const { token } = storeToRefs(userStore);
const { isArticleUserCollected } = storeToRefs(articleStore);
const { isLiked } = useUserLikedArticles();
const likeMutation = useLikeArticle();
// const { commentCount } = storeToRefs(commentStore);

const buttonRef = ref();
const popoverRef = ref();

const disabled = ref(true);

onMounted(() => {
  disabled.value = token.value ? false : true;
});

const likeClick = debounce((articleId?: number) => {
  if (articleId == null) return;
  if (token.value) {
    if (article.status) {
      Msg.showFail('文章已被封禁,不可点赞');
    } else {
      likeMutation.mutate(articleId);
    }
  } else {
    Msg.showInfo('请先登录');
    rootStore.toggleLoginDialog();
  }
});

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
@use '@/assets/css/detail-layout' as *;

// 布局定位(左侧栏 / 水平对齐)由父级 .detail-main grid 负责,
// 本组件只关心"随阅读滚动时贴在视口偏上中部"这一行为.
// 因此不再使用 position: fixed + top:50% + translateY(-50%),
// 而是在父 grid 单元格内 sticky.
.detail-panel {
  position: sticky;
  top: 20vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  font-size: 30px;

  @media (max-width: $detail-breakpoint-tablet) {
    position: static;
    min-width: 0;
    min-height: 60px;
    box-sizing: border-box;
    flex-direction: row;
    justify-content: space-around;
    gap: 4px;
    padding-block: 8px;
    border-block: 1px solid var(--border-color-list);

    :deep(.icon) {
      min-width: 44PX;
      min-height: 44PX;
      justify-content: center;
    }
  }
}
</style>
