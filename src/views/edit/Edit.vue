<template>
  <div class="edit">
    <!-- <Editor :editData="editData" @update:content="(content) => (preview = content)" /> -->
    <Suspense>
      <template #default>
        <ArticleEditor :editData="editData" @update:content="(content) => (preview = content)" />
      </template>
      <template #fallback>
        <div class="editor-loading">
          <i-loading class="loading-icon" />
          <span>编辑器加载中...</span>
        </div>
      </template>
    </Suspense>
    <el-drawer title="管理您的文章" v-model="drawer" direction="ltr" draggable :size="400">
      <EditForm @formSubmit="formSubmit" :draft="preview" :editData="editData" :fileList="fileList" @setCover="handleSetCover" />
    </el-drawer>
    <el-button class="submit-btn" @click="drawer = true" :icon="Menu">提交</el-button>
  </div>
</template>

<script lang="ts" setup>
import { Menu, Memo } from '@element-plus/icons-vue';
// import ArticleEditor from '@/components/wang-editor/ArticleEditor.vue';
// 动态加载 wangeditor 编辑器组件，减少首屏 JS 体积（约 791KB）
const ArticleEditor = defineAsyncComponent(() => import('@/components/wang-editor/ArticleEditor.vue'));
import EditForm from './cpns/EditForm.vue';
import { Msg, emitter, isEmptyObj, LocalCache } from '@/utils';

import useArticleStore from '@/stores/article.store';
import type { UploadProps, UploadUserFile } from 'element-plus';

const route = useRoute();
const articleStore = useArticleStore();
const { article } = storeToRefs(articleStore);
const isEdit = computed(() => !!route.query.editArticleId);
const editData = computed(() => (isEdit.value ? article.value : {}));
const drawer = ref(false);
const preview = ref('');
const fileList = ref<UploadUserFile[]>([]);
const isSubmitting = ref(false); // 标记是否正在提交，用于避免提交时显示离开提示

// 通过路由是否传入待修改文章的id来判断是创建还是修改
onMounted(() => {
  if (isEdit.value) {
    console.log('编辑模式 - 文章ID:', route.query.editArticleId);
    // 刷新后editData消失，重新获取
    if (!isEmptyObj(editData.value)) {
      articleStore.getDetailAction(route.query.editArticleId as any, true);
    }
  } else {
    console.log('创建模式');
    // 恢复草稿中的文件 ID，防止刷新后丢失关联（否则定时任务会误清理这些文件）
    const draft = LocalCache.getCache('draft');
    if (draft?.pendingImageIds?.length || draft?.pendingVideoIds?.length) {
      // 先清空再恢复，避免刷新页面时重复添加
      articleStore.clearAllPendingFiles();
      draft.pendingImageIds?.forEach((id: number) => articleStore.addPendingImageId(id));
      draft.pendingVideoIds?.forEach((id: number) => articleStore.addPendingVideoId(id));
      console.log('从草稿恢复文件ID:', { images: draft.pendingImageIds, videos: draft.pendingVideoIds });
    }
  }
  // 监听页面刷新/关闭，显示提示
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  // 只有在有内容且不是正在提交时才显示提示
  if ((preview.value || isEdit.value) && !isSubmitting.value) {
    // 显示浏览器确认对话框
    const message = '未保存的内容将会丢失，确定要离开吗？';
    event.preventDefault();
    event.returnValue = message; // 现代浏览器需要设置 returnValue
    return message; // 旧版浏览器需要返回字符串
  }
};

watch(
  () => article.value,
  (newV) => {
    emitter.emit('updateEditorContent', newV.content);
  },
);

const handleSetCover = (file) => {
  // 设置封面预览
  fileList.value = [file];
  console.log('设置封面预览:', file);
};

const formSubmit = (editData: any) => {
  if (!editData.title) {
    Msg.showFail('请输入标题!');
  } else if (!preview.value) {
    Msg.showFail('请输入内容!');
  } else {
    // 标记正在提交，避免显示离开提示
    isSubmitting.value = true;

    if (!isEdit.value) {
      //创建文章------------------------------------------
      const sumbitPayload = { content: preview.value, ...editData };
      console.log('创建文章', sumbitPayload);
      articleStore.createAction(sumbitPayload);
    } else {
      //修改文章------------------------------------------
      const updatedPayload = { articleId: article.value.id, content: preview.value, ...editData };
      console.log('修改文章', updatedPayload);
      articleStore.updateAction(updatedPayload);
    }
  }
};
</script>

<style lang="scss" scoped>
@use '@/assets/css/editor';
.edit {
  .submit-btn {
    position: fixed;
    bottom: 0;
    left: 0;
    border: 0;
    opacity: 0.9;
  }

  :deep(.el-drawer) {
    background-color: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(1px);
  }

  .editor-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: #909399;
    font-size: 14px;
    gap: 12px;

    .loading-icon {
      font-size: 32px;
      animation: spin 1s linear infinite;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
}
</style>
