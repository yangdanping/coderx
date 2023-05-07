<template>
  <div>
    <div class="editor-container">
      <Toolbar class="toolbar" :editor="editorRef" :defaultConfig="toolbarConfig" mode="default" />
      <Editor
        :style="{ height, 'overflow-y': 'hidden' }"
        v-model="valueHtml"
        :defaultConfig="editorConfig"
        @onChange="handleChanged"
        @onCreated="(editor) => (editorRef = editor)"
        mode="default"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import { LocalCache } from '@/utils';
import { useEditorConfig } from './config';

const editorRef = shallowRef();
const [toolbarConfig, editorConfig] = useEditorConfig();
const props = defineProps({
  editData: {
    type: Object,
    default: () => {}
  },
  isComment: {
    type: Boolean,
    default: false
  },
  editComment: {
    type: String,
    default: ''
  },
  height: {
    type: [Number, String],
    default: '100vh'
  }
});

const valueHtml = ref('');
onMounted(() => {
  nextTick(() => {
    // console.log('editor onMounted', LocalCache.getCache('draft'), props.editData, props.isComment);
    if (LocalCache.getCache('draft') && !props.editData && !props.isComment) {
      const { draft } = LocalCache.getCache('draft');
      valueHtml.value = draft;
      console.log('保存', valueHtml.value);
    } else if (props.editData) {
      const { content } = props.editData;
      valueHtml.value = content;
    } else if (props.editComment) {
      valueHtml.value = props.editComment;
    }
  });
  // emitter.on('cleanContent', () => (valueHtml.value = ''));
});

const emit = defineEmits(['update:content']);
//监听editor数据变化
watch(
  () => valueHtml.value,
  (newV) => emit('update:content', newV),
  { deep: true }
);

const handleChanged = (editor: any) => {
  if (editor.isEmpty()) {
    valueHtml.value = '';
  } else {
    console.log('handleChanged', valueHtml.value);
  }
};

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});
</script>

<style lang="scss" scoped>
.editor-container {
  border: 1px solid #ccc;
  .toolbar {
    border-bottom: 1px solid #ccc;
  }
}
</style>
