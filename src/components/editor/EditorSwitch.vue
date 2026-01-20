<template>
  <div class="editor-switch-container">
    <!-- 开发/测试环境显示版本切换 -->
    <div v-if="isDev" class="editor-version-toggle">
      <el-radio-group v-model="editorVersion" size="small">
        <el-radio-button value="1.0">wangeditor</el-radio-button>
        <el-radio-button value="2.0">Tiptap</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 动态加载编辑器组件 -->
    <component :is="currentEditor" v-bind="$attrs" @update:content="handleContentUpdate" />
  </div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

// 编辑器版本类型
type EditorVersion = '1.0' | '2.0';

// 动态加载编辑器组件（减少首屏 JS 体积）
const WangEditor = defineAsyncComponent(() => import('@/components/wang-editor/ArticleEditor.vue'));
const TiptapEditor = defineAsyncComponent(() => import('@/components/tiptap-editor/TiptapEditor.vue'));

// Props 定义
const props = withDefaults(
  defineProps<{
    version?: EditorVersion;
  }>(),
  {
    version: '1.0', // 默认使用 1.0 版本（wangeditor）
  },
);

// 是否为开发环境
const isDev = import.meta.env.DEV;

// 编辑器版本状态（开发环境可切换，生产环境使用 props.version）
const editorVersion = ref<EditorVersion>(props.version);

// 监听 props.version 变化
watch(
  () => props.version,
  (newVersion) => {
    editorVersion.value = newVersion;
  },
);

// 当前编辑器组件
const currentEditor = computed(() => {
  return editorVersion.value === '2.0' ? TiptapEditor : WangEditor;
});

// 内容更新事件
const emit = defineEmits<{
  (e: 'update:content', content: string): void;
}>();

const handleContentUpdate = (content: string) => {
  emit('update:content', content);
};
</script>

<style lang="scss" scoped>
.editor-switch-container {
  display: flex;
  flex-direction: column;
  height: 100vh; // 使用 100vh 确保占满整个视口高度
}

.editor-version-toggle {
  padding: 8px 12px;
  background: #f5f7fa;
  @include thin-border(bottom, #eee);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0; // 防止被压缩

  &::before {
    content: '编辑器版本：';
    font-size: 12px;
    color: #909399;
  }
}

// 确保动态组件能占满剩余空间
:deep(.tiptap-editor-container),
:deep(.article-editor-container) {
  flex: 1;
  min-height: 0;
}
</style>
