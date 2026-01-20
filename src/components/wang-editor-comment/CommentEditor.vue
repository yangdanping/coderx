<template>
  <div class="comment-editor-container">
    <Toolbar :editor="editorRef" :defaultConfig="toolbarConfig" :mode="mode" style="border-bottom: 1px solid #eee" />
    <Editor
      :style="{ height, 'overflow-y': height === 'auto' ? 'visible' : 'hidden' }"
      v-model="valueHtml"
      :defaultConfig="editorConfig"
      @onChange="handleChanged"
      @onCreated="handleCreated"
      :mode="mode"
    />
  </div>
</template>

<script lang="ts" setup>
import { Editor, Toolbar } from '@wangeditor-next/editor-for-vue';
import { emitter } from '@/utils';
import { useCommentEditorConfig } from './config';

const editorRef = shallowRef();
const [toolbarConfig, editorConfig] = useCommentEditorConfig();

const {
  editComment = '',
  mode = 'simple',
  height = 'auto',
} = defineProps<{
  editComment?: string;
  mode?: 'default' | 'simple';
  height?: number | string;
}>();

const valueHtml = ref('');

onMounted(() => {
  console.log('CommentEditor onMounted, editComment:', editComment);
  nextTick(() => {
    if (editComment) {
      valueHtml.value = editComment;
      console.log('CommentEditor 修改评论-------------------------------', valueHtml.value);
    }
  });

  emitter.on('cleanContent', () => (valueHtml.value = ''));
  emitter.on('updateEditorContent', (content) => {
    valueHtml.value = content as any;
  });
});

const emit = defineEmits(['update:content']);

// 监听 editor 数据变化
watch(
  () => valueHtml.value,
  (newV) => {
    emit('update:content', newV);
  },
  { deep: true },
);

const handleCreated = (editor) => {
  editorRef.value = editor;
};

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
.comment-editor-container {
  border: 1px solid #eee;
}
</style>
