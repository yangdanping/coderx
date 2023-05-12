<template>
  <div class="action-list" :class="{ comment: isComment }">
    <slot name="article"></slot>
    <slot name="comment"></slot>
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
.action-list {
  :deep([class$='-action']),
  :deep([class$='-action']) > .item {
    display: flex;
    align-items: center;
    user-select: none;
    margin-top: 5px;

    span {
      margin-left: 4px;
      color: var(--fc);
    }
  }
  :deep([class$='-action']) > .item {
    margin-right: 20px;
    font-size: 16px;
    cursor: pointer;
  }
}
.action-list.comment {
  [class^='comment'] {
    padding: 0 0 40px 0;
  }
}
</style>
