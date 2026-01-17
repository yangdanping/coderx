<template>
  <div class="edit">
    <!-- 使用 EditorSwitch 支持 1.0/2.0 版本切换 -->
    <Suspense>
      <template #default>
        <EditorSwitch :editData="editData" :version="editorVersion" @update:content="(content) => (preview = content)" />
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
import { Menu } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
// 使用 EditorSwitch 组件支持编辑器版本切换
const EditorSwitch = defineAsyncComponent(() => import('@/components/editor/EditorSwitch.vue'));
import EditForm from './cpns/EditForm.vue';

// 编辑器版本：开发环境默认 2.0（Tiptap），生产环境默认 1.0（wangeditor）
const editorVersion = ref<'1.0' | '2.0'>(import.meta.env.DEV ? '2.0' : '1.0');
import { Msg, emitter, isEmptyObj, LocalCache } from '@/utils';

import useArticleStore from '@/stores/article.store';
import type { UploadProps, UploadUserFile } from 'element-plus';

const route = useRoute();
const router = useRouter();
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
    console.log('编辑模式 - 文章ID:', route.query.editArticleId,editData.value);
    // 刷新后editData消失，重新获取
    if (isEmptyObj(editData.value)) {
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
  // 监听 Ctrl+Q 快捷键
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('keydown', handleKeyDown);
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

// 快捷键监听
const handleKeyDown = (event: KeyboardEvent) => {
  // Ctrl+Q (Mac 和 Windows 都使用 Ctrl)
  if (event.ctrlKey && event.key === 'q') {
    event.preventDefault(); // 阻止浏览器默认行为（如关闭窗口）
    handleExitEdit();
  }
};

// 退出修改
const handleExitEdit = async () => {
  // 如果有未保存的内容，显示确认对话框
  if ((preview.value || isEdit.value) && !isSubmitting.value) {
    try {
      await ElMessageBox.confirm('是否取消修改', '提示', {
        confirmButtonText: '取消修改',
        cancelButtonText: '再想想',
        type: 'warning',
      });
      // 用户确认后返回上一页
      router.back();
    } catch {
      // 用户取消操作，不做任何处理
    }
  } else {
    // 没有内容，直接返回
    router.back();
  }
};

watch(
  () => article.value,
  (newV) => {
    console.log('[Edit.vue] article watch 触发:', { hasContent: !!newV?.content, contentLength: newV?.content?.length });
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
