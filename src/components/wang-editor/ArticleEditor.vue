<template>
  <div class="article-editor-container">
    <Toolbar :editor="editorRef" :defaultConfig="toolbarConfig" :mode="props.mode" style="border-bottom: 1px solid #eee" />
    <Editor
      :style="{ height: props.height, 'overflow-y': 'hidden' }"
      v-model="valueHtml"
      :defaultConfig="editorConfig"
      @onChange="handleChanged"
      @onCreated="(editor) => (editorRef = editor)"
      :mode="props.mode"
    />
  </div>
</template>

<script lang="ts" setup>
import { Editor, Toolbar } from '@wangeditor-next/editor-for-vue';
import { LocalCache, isEmptyObj, emitter } from '@/utils';
import { useArticleEditorConfig } from './config';
const editorRef = shallowRef();
const [toolbarConfig, editorConfig] = useArticleEditorConfig();
import type { IArticle } from '@/stores/types/article.result';

// 注意：不要解构 props，否则会失去响应式
const props = withDefaults(
  defineProps<{
    editData?: IArticle;
    mode?: 'default' | 'simple';
    height?: number | string;
  }>(),
  {
    editData: () => ({}) as IArticle,
    mode: 'default',
    height: '100vh',
  },
);

const valueHtml = ref('');
onMounted(() => {
  nextTick(() => {
    const draft = LocalCache.getCache('draft');
    const isEditMode = !isEmptyObj(props.editData);

    console.log('[WangEditor] onMounted:', { isEditMode, hasContent: !!props.editData?.content, hasDraft: !!draft });

    if (isEditMode && draft) {
      // 编辑模式 + 有草稿：优先使用草稿（用户可能编辑了但未提交）
      valueHtml.value = draft.draft;
    } else if (isEditMode) {
      // 编辑模式 + 无草稿：使用原文章内容
      valueHtml.value = props.editData?.content ?? '';
    } else if (draft) {
      // 创建模式 + 有草稿：恢复草稿（修复：原逻辑遗漏了此场景）
      valueHtml.value = draft.draft;
    }
    // 创建模式 + 无草稿：保持空白（valueHtml 默认值为 ''）
  });

  emitter.on('cleanContent', () => (valueHtml.value = ''));
  emitter.on('updateEditorContent', (content) => {
    console.log('[WangEditor] updateEditorContent 事件:', { contentLength: (content as string)?.length });
    valueHtml.value = content as any;
  });
});
const emit = defineEmits(['update:content']);
//监听editor数据变化
watch(
  () => valueHtml.value,
  (newV) => {
    emit('update:content', newV);
  },
  { deep: true },
);

// 监听 editData.content 变化，解决异步加载时序问题
watch(
  () => props.editData?.content,
  (newContent) => {
    console.log('[WangEditor] watch 触发:', {
      hasContent: !!newContent,
      contentLength: newContent?.length,
      currentValueHtml: valueHtml.value?.length,
    });
    // 只要有新内容且当前内容为空，就设置内容
    // 不再依赖 isEmptyObj 判断，因为 Proxy 对象可能导致误判
    if (newContent && !valueHtml.value) {
      console.log('[WangEditor] 设置编辑器内容');
      valueHtml.value = newContent;
    }
  },
  { immediate: true },
);

const handleChanged = (editor: any) => {
  if (editor.isEmpty()) {
    valueHtml.value = '';
  }
};

// 组件销毁时，也及时销毁编辑器
onUnmounted(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});
</script>

<style lang="scss" scoped>
.article-editor-container {
  border: 1px solid #eee;
}
</style>
