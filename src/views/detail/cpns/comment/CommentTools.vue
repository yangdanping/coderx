<template>
  <div class="comment-tools">
    <el-dropdown trigger="click" @command="handleCommand">
      <button class="tools-trigger" type="button" aria-label="更多评论操作">
        <el-icon aria-hidden="true" size="20px"><MoreHorizontal /></el-icon>
      </button>
      <template #dropdown>
        <el-dropdown-menu v-if="isOwner">
          <el-dropdown-item command="edit">
            <el-icon aria-hidden="true" size="20px"><Edit /></el-icon>
            <span>编辑</span>
          </el-dropdown-item>
          <el-dropdown-item command="remove">
            <el-icon aria-hidden="true" size="20px"><Trash2 /></el-icon>
            <span>删除</span>
          </el-dropdown-item>
        </el-dropdown-menu>
        <el-dropdown-menu v-else>
          <el-dropdown-item command="report">
            <el-icon aria-hidden="true" size="20px"><AlertTriangle /></el-icon>
            <span>举报</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 编辑对话框 -->
    <el-dialog width="min(92vw, 640px)" title="修改我的评论" v-model="isShowEdit" append-to-body destroy-on-close center>
      <TiptapEditorComment @update:content="(valueHtml) => (editContent = valueHtml)" :editComment="comment.content" />
      <el-button @click="submitEdit" :loading="isUpdating" type="primary" style="margin-top: 10px">修改</el-button>
    </el-dialog>

    <!-- 举报对话框 -->
    <ReportDialog @submit="submitReport" @cancel="isShowReport = false" :show="isShowReport" />
  </div>
</template>

<script lang="ts" setup>
import { ElMessageBox } from 'element-plus';
import { Msg } from '@/utils';
import TiptapEditorComment from '@/components/tiptap-editor-comment/TiptapEditorComment.vue';
import ReportDialog from '@/components/dialog/ReportDialog.vue';
import { useRoute } from 'vue-router';
import { MoreHorizontal, Edit, Trash2, AlertTriangle } from '@lucide/vue';

import useUserStore from '@/stores/user.store';
import { useUpdateComment, useDeleteComment } from '@/composables/useCommentList';
import { useAuth } from '@/composables/useAuth';

import type { IComment } from '@/service/comment/comment.request';

const props = defineProps<{
  comment: IComment;
  parentCommentId?: number; // 如果是回复，传入父评论ID
}>();

const route = useRoute();
const userStore = useUserStore();
const { isCurrentUser } = useAuth();

const articleId = computed(() => String(route.params.articleId || ''));
const parentId = computed(() => props.parentCommentId);

// 是否为评论所有者（判断当前登录用户是否为该评论的作者）
const isOwner = computed(() => isCurrentUser(props.comment.author?.id));

// 状态
const isShowEdit = ref(false);
const isShowReport = ref(false);
const editContent = ref('');
const isUpdating = ref(false);

// Mutations（传入父评论ID用于刷新回复列表）
const updateMutation = useUpdateComment(articleId, parentId);
const deleteMutation = useDeleteComment(articleId, parentId);

// 处理菜单命令
const handleCommand = (command: string) => {
  switch (command) {
    case 'edit':
      isShowEdit.value = true;
      break;
    case 'remove':
      handleRemove();
      break;
    case 'report':
      isShowReport.value = true;
      break;
  }
};

// 提交编辑
const submitEdit = async () => {
  if (!editContent.value.trim()) {
    Msg.showInfo('评论内容不能为空');
    return;
  }

  isUpdating.value = true;
  try {
    await updateMutation.mutateAsync({
      commentId: props.comment.id,
      content: editContent.value,
    });
    isShowEdit.value = false;
  } finally {
    isUpdating.value = false;
  }
};

// 处理删除
const handleRemove = () => {
  ElMessageBox.confirm('是否删除该评论？', '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  }).then(() => {
    deleteMutation.mutate(props.comment.id);
  });
};

// 提交举报
const submitReport = ({ reportOptions, otherReport }: { reportOptions: string[]; otherReport: string }) => {
  if (reportOptions.length || otherReport) {
    const options = [...reportOptions];
    if (otherReport) options.push(otherReport);
    const report = { commentId: props.comment.id, reportOptions: options };
    userStore.reportAction({ userId: props.comment.author?.id, report });
    isShowReport.value = false;
    Msg.showSuccess('举报已提交');
  } else {
    Msg.showInfo('您没有提交任何举报信息');
    isShowReport.value = false;
  }
};
</script>

<style lang="scss" scoped>
.comment-tools {
  position: absolute;
  right: 30px;
  top: 20px;
}

.tools-trigger {
  display: inline-flex;
  width: 44PX;
  height: 44PX;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

@media (max-width: 992px) {
  .comment-tools {
    position: static;
    width: 44PX;
    height: 44PX;
  }
}
</style>
