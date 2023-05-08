<template>
  <div class="action-list" :class="{ comment: isComment }">
    <slot name="article"></slot>
    <slot name="comment"></slot>
    <slot name="reply"></slot>
  </div>
</template>

<script lang="ts" setup>
defineProps({
  isComment: {
    type: Boolean,
    default: false
  }
});
</script>

<style lang="scss" scoped>
.comment {
  [class^='comment'] {
    padding: 0 0 10px 0;
  }
}
.action-list {
  :deep([class$='-action']),
  :deep([class$='-action']) > .item {
    display: flex;
    align-items: center;
    user-select: none;
    margin-top: 5px;
    i {
      width: 20px;
      height: 20px;
      background-size: cover;
    }
    span {
      margin-left: 4px;
      color: var(--fc);
    }
    .view i {
      background-image: url('@/assets/img/article/view.png');
    }
    .like i {
      background-image: url('@/assets/img/article/like.png');
    }
    .comment i {
      background-image: url('@/assets/img/article/comment.png');
    }
    .like:hover i {
      background-image: url('@/assets/img/article/like-active.png');
    }
    .comment:hover i {
      background-image: url('@/assets/img/article/comment-active.png');
    }
    .like:hover,
    .comment:hover {
      span {
        color: #509afb;
      }
    }
  }
  :deep([class$='-action']) > .item {
    margin-right: 20px;
    font-size: 16px;
    cursor: pointer;
  }
  :deep(.liked) {
    span {
      color: #509afb !important;
    }
    i {
      background-image: url('@/assets/img/article/like-active.png') !important;
    }
  }
}
</style>
