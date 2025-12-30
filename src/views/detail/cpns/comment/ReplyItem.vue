<template>
  <div class="reply-item">
    <Avatar :info="item.author" :size="35" />
    <div class="reply-box">
      <!-- 用户信息 -->
      <div class="user-info-box">
        <div class="user-info">
          <div class="name">
            <span>{{ item.author?.name }}</span>
            <el-tag v-if="isAuthor(item.author?.id)" size="small">作者</el-tag>
          </div>
        </div>
        <div class="floor">
          <span v-dateformat="item.createAt"></span>
        </div>
      </div>

      <!-- 被引用的回复内容 (QuotedReply) -->
      <div v-if="quotedContent" class="quoted-reply">
        <el-tooltip effect="dark" content="转到回复位置" placement="top">
          <div class="quoted-wrapper" @click.stop="handleScrollToParent">
            <!-- 引用头部 -->
            <div class="quoted-header">
              <span class="quoted-author">{{ replyToName }} 回复:</span>
              <el-icon class="goto-icon"><CornerDownRight /></el-icon>
            </div>
            <!-- 引用内容 -->
            <div ref="quotedBodyRef" class="quoted-body" :class="{ 'is-collapsed': isCollapsed && needsCollapse }">
              <div class="quoted-content editor-content-view" v-dompurify-html="quotedContent"></div>
              <!-- 渐变遮罩（仅折叠时显示） -->
              <div v-if="isCollapsed && needsCollapse" class="collapse-overlay"></div>
            </div>
            <!-- 展开/收起按钮 -->
            <div v-if="needsCollapse" class="collapse-toggle">
              <span class="toggle-text" @click.stop="toggleCollapse">
                {{ isCollapsed ? 'Click to expand...' : '收起' }}
              </span>
            </div>
          </div>
        </el-tooltip>
      </div>

      <!-- 回复内容 -->
      <div class="editor-content">
        <div class="editor-content-view" :style="item.status ? 'color: red' : ''" v-dompurify-html="item.content"></div>
        <CommentAction :comment="item" :parentCommentId="parentComment.id" />
      </div>

      <!-- 回复表单 -->
      <CommentForm v-if="isReplying" :commentId="parentComment.id" :replyId="item.id" isReply @cancel="closeReplyForm" />
    </div>

    <!-- 工具栏 -->
    <CommentTools :comment="item" :parentCommentId="parentComment.id" />
  </div>
</template>

<script lang="ts" setup>
import Avatar from '@/components/avatar/Avatar.vue';
import CommentAction from './CommentAction.vue';
import CommentForm from './CommentForm.vue';
import CommentTools from './CommentTools.vue';

import useArticleStore from '@/stores/article.store';
import useCommentStore from '@/stores/comment.store';

import type { IComment } from '@/service/comment/comment.request';
import { ref, computed, onMounted, nextTick } from 'vue';
import { CornerDownRight } from 'lucide-vue-next';

const COLLAPSE_HEIGHT = 150; // 折叠阈值（px）

const props = defineProps<{
  item: IComment;
  parentComment: IComment; // 父级一级评论
}>();

const emit = defineEmits<{
  scrollToParent: [replyId: number];
}>();

const articleStore = useArticleStore();
const commentStore = useCommentStore();
const { isAuthor } = storeToRefs(articleStore);

// ==================== 引用内容相关 ====================

const quotedBodyRef = ref<HTMLElement | null>(null);
const isCollapsed = ref(true); // 默认折叠
const needsCollapse = ref(false); // 是否需要折叠（内容超过阈值）

// 被回复的用户名（只有回复其他回复时使用）
const replyToName = computed(() => props.item.replyTo?.name || null);

// 被引用的内容（只有回复其他回复时才显示，回复根评论不显示）
const quotedContent = computed(() => {
  // 如果 rid 为 null，说明回复的是根评论，不显示引用内容
  if (!props.item.rid) {
    return null;
  }
  // 回复其他回复时，使用 replyTo.content
  return props.item.replyTo?.content || null;
});

// 检测内容高度，判断是否需要折叠
const checkContentHeight = async () => {
  await nextTick();
  if (quotedBodyRef.value) {
    const scrollHeight = quotedBodyRef.value.scrollHeight;
    needsCollapse.value = scrollHeight > COLLAPSE_HEIGHT;
  }
};

// 切换折叠状态
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// 点击跳转到被回复的位置
const handleScrollToParent = () => {
  emit('scrollToParent', props.item.id);
};

onMounted(() => {
  checkContentHeight();
});

// ==================== 回复表单相关 ====================

// 是否正在回复此回复
const isReplying = computed(() => commentStore.activeReplyId === props.item.id);

// 关闭回复表单
const closeReplyForm = () => {
  commentStore.setActiveReply(null);
};
</script>

<style lang="scss" scoped>
@use '@/assets/css/editor';

.reply-item {
  display: flex;
  position: relative;
  background-image: var(--blockBg);
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 4px;

  .reply-box {
    display: flex;
    flex-direction: column;
    margin-left: 10px;
    width: 100%;

    .user-info-box {
      display: flex;
      align-items: center;
      padding-top: 5px;
      flex-wrap: wrap;

      .user-info {
        display: flex;
        align-items: center;

        .name {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;

          span:not(.el-tag):not(.reply-to) {
            font-weight: 700;
            font-size: 15px;
          }
        }
      }

      .floor span {
        margin-left: 10px;
        font-size: 10px;
      }
    }

    // ==================== 引用回复样式 ====================
    .quoted-reply {
      margin: 8px 0;

      .quoted-wrapper {
        border-left: 2px solid #4a5568;
        padding: 10px 12px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
          border-left-color: #66b1ff;
        }
      }

      .quoted-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

        .quoted-author {
          font-size: 13px;
          font-weight: 600;
        }

        .goto-icon {
          font-size: 14px;
          color: #909399;
          transform: rotate(180deg);
          transition: color 0.2s;
        }
      }

      .quoted-wrapper:hover .goto-icon {
        color: #66b1ff;
      }

      .quoted-body {
        position: relative;
        overflow: hidden;
        transition: max-height 0.3s ease;

        &.is-collapsed {
          max-height: 150px;
        }

        .quoted-content {
          font-size: 13px;
          line-height: 1.6;

          :deep(p) {
            margin: 4px 0;
          }

          :deep(img) {
            max-width: 100%;
            border-radius: 4px;
          }
        }

        .collapse-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.1) 70%);
          pointer-events: none;
        }
      }

      .collapse-toggle {
        margin-top: 8px;
        text-align: center;

        .toggle-text {
          font-size: 12px;
          color: #66b1ff;
          cursor: pointer;
          padding: 4px 12px;
          border-radius: 4px;
          transition: all 0.2s;
        }
      }
    }

    .editor-content {
      padding: 10px 0;
    }
  }
}

// Popover 内容样式
.popover-content {
  text-align: center;
  font-size: 13px;
  color: #606266;
}
</style>
