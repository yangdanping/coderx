<template>
  <div class="edit">
    <!-- 数据就绪后才渲染编辑器 ,即 await 接口返回数据） -->
    <template v-if="isDataReady">
      <!-- 下拉标题组件 -->
      <PullDownHeader v-model="articleTitle" v-model:isPulled="isPulled" />

      <!-- 直接使用 TiptapEditor -->
      <div class="editor-wrapper" :class="{ 'is-pulled': isPulled }">
        <!-- 顶部边框触发区 -->
        <div class="top-border-trigger" @click="isPulled = !isPulled"></div>

        <!-- 绳子图标 -->
        <div class="rope-icon-wrapper" @click="isPulled = !isPulled">
          <img src="@/assets/img/pull.png" alt="pull" class="rope-icon" draggable="false" />
        </div>

        <TiptapEditor :editData="editData" @update:content="(content) => (preview = content)" />
      </div>
    </template>
    <!-- 编辑模式下数据加载中显示 loading -->
    <div v-else class="editor-loading">
      <i-loading class="loading-icon" />
      <span>正在加载文章数据...</span>
    </div>
    <el-drawer v-if="isDataReady" title="管理您的文章" v-model="drawer" direction="ltr" draggable :size="400">
      <EditForm @formSubmit="formSubmit" :draft="preview" :editData="editData" :fileList="fileList" v-model:title="articleTitle" @setCover="handleSetCover" />
    </el-drawer>
    <el-tooltip content="提交 (⌃Q)" placement="top" :show-after="100">
      <el-button class="submit-btn" @click="drawer = true" :icon="Check">提交</el-button>
    </el-tooltip>
    <AiAssistant :context="preview" />
  </div>
</template>

<script lang="ts" setup>
import { Check } from 'lucide-vue-next';
// 直接使用 TiptapEditor 组件
import TiptapEditor from '@/components/tiptap-editor/TiptapEditor.vue';
import EditForm from './cpns/EditForm.vue';
import PullDownHeader from './cpns/PullDownHeader.vue';
import AiAssistant from '@/components/AiAssistant.vue';

import { Msg, emitter, isEmptyObj, LocalCache } from '@/utils';

import useArticleStore from '@/stores/article.store';
import type { UploadProps, UploadUserFile } from 'element-plus';

const route = useRoute();
const router = useRouter();
interface Props {
  borderColor?: string;
  defaultExpose?: number; // 默认露出比例 (0-1)，默认 0.5
  pulledExpose?: number; // 下拉后露出比例 (0-1)，默认 0.7
}

const props = withDefaults(defineProps<Props>(), {
  borderColor: 'var(--el-color-primary)',
  defaultExpose: 0.6,
  pulledExpose: 1,
});

const articleStore = useArticleStore();
const { article } = storeToRefs(articleStore);
const isEdit = computed(() => !!route.query.editArticleId);
const editData = computed(() => (isEdit.value ? article.value : {}));
const drawer = ref(false);
const preview = ref('');
const articleTitle = ref('');
const isPulled = ref(false);

const ropeTranslateY = computed(() => {
  const expose = isPulled.value ? props.pulledExpose : props.defaultExpose;
  return `-${(1 - expose) * 100}%`;
});

const fileList = ref<UploadUserFile[]>([]);
const isSubmitting = ref(false); // 标记是否正在提交，用于避免提交时显示离开提示
// 数据是否就绪：创建模式直接可用，编辑模式需要等待 API 返回
const isDataReady = ref(!isEdit.value);
console.log('[Edit.vue] 初始化 isDataReady:', isDataReady.value, '编辑模式:', isEdit.value);

// 通过路由是否传入待修改文章的id来判断是创建还是修改
onMounted(async () => {
  console.log('[Edit.vue] onMounted 开始');
  if (isEdit.value) {
    const hasData = isEmptyObj(editData.value); // true 表示"不为空"
    console.log('[Edit.vue] 编辑模式 - 文章ID:', route.query.editArticleId, '已有数据:', hasData, editData.value);
    // 刷新后 editData 消失，重新获取（注意：isEmptyObj 返回 true 表示"不为空"）
    if (!hasData) {
      console.log('[Edit.vue] editData 为空，开始请求 API...');
      await articleStore.getDetailAction(route.query.editArticleId as any, true);
      console.log('[Edit.vue] API 请求完成，editData:', article.value);
    }
    // 同步标题
    articleTitle.value = article.value.title || '';
    // API 返回后设置为 ready
    isDataReady.value = true;
    console.log('[Edit.vue] isDataReady 设置为 true');
  } else {
    console.log('[Edit.vue] 创建模式');
    // 恢复草稿中的文件 ID，防止刷新后丢失关联（否则定时任务会误清理这些文件）
    const draft = LocalCache.getCache('draft');
    if (draft) {
      if (draft.title) articleTitle.value = draft.title;
      if (draft.pendingImageIds?.length || draft.pendingVideoIds?.length) {
        // 先清空再恢复，避免刷新页面时重复添加
        articleStore.clearAllPendingFiles();
        draft.pendingImageIds?.forEach((id: number) => articleStore.addPendingImageId(id));
        draft.pendingVideoIds?.forEach((id: number) => articleStore.addPendingVideoId(id));
        console.log('[Edit.vue] 从草稿恢复文件ID:', { images: draft.pendingImageIds, videos: draft.pendingVideoIds });
      }
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
  // Ctrl+Q (Mac 和 Windows 都使用 Ctrl) - toggle 侧栏显示
  if (event.ctrlKey && event.key === 'q') {
    event.preventDefault(); // 阻止浏览器默认行为（如关闭窗口）
    drawer.value = !drawer.value;
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
    if (newV.title) articleTitle.value = newV.title;
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
.edit {
  display: flex;
  flex-direction: column;
  height: 100vh; // 确保占满整个视口高度

  .submit-btn {
    position: fixed;
    bottom: 0;
    left: 0;
    border: 0;
    opacity: 0.9;
  }

  :deep(.el-drawer) {
    @include glass-effect;
  }

  .editor-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: var(--text-secondary);
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

  .editor-wrapper {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
    min-height: 0;

    &.is-pulled {
      :deep(.tiptap-editor-container) {
        border-top-color: v-bind('props.borderColor');
        border-top-width: 2px;
      }
    }

    .top-border-trigger {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px; // 更加精确的顶边触发区
      cursor: pointer;
      z-index: 105; // 确保在所有内容之上
      transition: background-color 0.2s;

      &:hover {
        background-color: v-bind('props.borderColor');
      }

      // 只有 hover 触发器时，下方的编辑器边框才变粗
      &:hover ~ :deep(.tiptap-editor-container) {
        border-top-width: 4px !important; // 强制覆盖
        border-top-color: v-bind('props.borderColor') !important;
      }
    }

    .rope-icon-wrapper {
      position: absolute;
      top: 0;
      right: 40px;
      width: 30px;
      height: 150px; // 维持一定高度以便点击 handle
      cursor: pointer;
      z-index: 101;
      display: flex;
      justify-content: center;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
      transform: translateY(v-bind(ropeTranslateY));
      pointer-events: none; // 默认禁用，由子元素 handle 响应
      user-select: none;

      .rope-icon {
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: auto; // 只有绳子图标本身响应点击
        // 使用 drop-shadow 生成与透明 PNG 轮廓完全一致的阴影
        filter: drop-shadow(4px 5px 5px rgba(0, 0, 0, 0.25)); // 向右偏移  向下偏移 阴影模糊半径
        transition: filter 0.3s;

        &:hover {
          // 鼠标悬浮时稍微加深阴影并增加偏移，增加“可拉拽”的立体交互感
          filter: drop-shadow(4px 7px 6px rgba(0, 0, 0, 0.35));
        }
      }
    }
  }

  // 确保编辑器能占满剩余空间
  :deep(.tiptap-editor-container) {
    flex: 1;
    min-height: 0;
    transition:
      border-width 0.2s,
      border-color 0.2s;
    border-top: 1px solid var(--el-border-color);
  }
}
</style>
