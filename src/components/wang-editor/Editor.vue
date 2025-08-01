<template>
  <div class="editor-container" :class="{ fixed: !isComment }">
    <Toolbar :editor="editorRef" :defaultConfig="toolbarConfig" :mode="mode" style="border-bottom: 1px solid #ccc" />
    <Editor
      v-if="isComment"
      :style="{ height, 'overflow-y': 'hidden' }"
      v-model="valueHtml"
      :defaultConfig="editorConfig"
      @onChange="handleChanged"
      @onCreated="handleCreated"
      :mode="mode"
    />
    <el-row v-else>
      <el-col :span="isShowPreviw ? 12 : 24">
        <Editor
          :style="{ height, 'overflow-y': 'hidden' }"
          v-model="valueHtml"
          :defaultConfig="editorConfig"
          @onChange="handleChanged"
          @onCreated="(editor) => (editorRef = editor)"
          :mode="mode"
        />
      </el-col>
      <el-col :span="12" class="preview">
        <div class="editor-content-view preview-content" v-dompurify-html="valueHtml"></div>
      </el-col>
    </el-row>
    <el-tooltip class="item" effect="dark" :content="`${isShowPreviw ? '关闭' : '打开'}预览`" placement="top">
      <el-button class="show-preview-btn" @click="togglePreview" :icon="Memo"></el-button>
    </el-tooltip>
  </div>
</template>

<script lang="ts" setup>
import { Memo } from '@element-plus/icons-vue';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import { LocalCache, isEmptyObj, emitter } from '@/utils';
import { useEditorConfig } from './config';
import { DomEditor } from '@wangeditor/editor';
const editorRef = shallowRef();
const [toolbarConfig, editorConfig] = useEditorConfig();

import type { IArticle } from '@/stores/types/article.result';
const props = defineProps({
  editData: {
    type: Object as PropType<IArticle>,
    default: () => {},
  },
  isComment: {
    type: Boolean,
    default: false,
  },
  editComment: {
    type: String,
    default: '',
  },
  mode: {
    type: String as PropType<'default' | 'simple'>,
    default: 'default',
  },
  height: {
    type: [Number, String],
    default: '100vh',
  },
});
const valueHtml = ref('');
const isShowPreviw = ref(LocalCache.getCache('isShowPreviw') ?? true);
onMounted(() => {
  console.log('LocalCache.getCache', LocalCache.getCache('isShowPreviw'));
  console.log('editor onMounted', LocalCache.getCache('draft'), props.editData, props.isComment);
  nextTick(() => {
    const draft = LocalCache.getCache('draft');
    const isDraft = !!draft && !isEmptyObj(props.editData) && !props.isComment;
    if (isDraft) {
      valueHtml.value = draft.draft;
      console.log('Editor组件 修改已保存文章内容的草稿-------------------------------', valueHtml.value);
    } else if (isEmptyObj(props.editData)) {
      valueHtml.value = props.editData.content ?? '';
      // console.log('Editor组件 修改已上传文章内容-------------------------------', valueHtml.value);
    } else if (props.editComment) {
      valueHtml.value = props.editComment;
      console.log('Editor组件 修改评论-------------------------------', valueHtml.value);
    }
  });
  emitter.on('cleanContent', () => (valueHtml.value = ''));
  emitter.on('updateEditorContent', (content) => {
    // console.log('updateEditorContent', content);
    valueHtml.value = content as any;
  });
});
const togglePreview = () => {
  isShowPreviw.value = !isShowPreviw.value;
  LocalCache.setCache('isShowPreviw', isShowPreviw.value);
};
const emit = defineEmits(['update:content']);
//监听editor数据变化
watch(
  () => valueHtml.value,
  (newV) => {
    emit('update:content', newV);
  },
  { deep: true },
);

const handleCreated = (editor) => {
  editorRef.value = editor;
  const toolbar = DomEditor.getToolbar(editor);
};
const handleChanged = (editor: any) => {
  if (editor.isEmpty()) {
    valueHtml.value = '';
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
  .preview {
    border-left: 1px solid #ccc;
    overflow: auto;
    background: #fafff3;
    height: 100vh;
    word-wrap: break-word;
    display: inline-block;
    vertical-align: top;
    /* box-sizing: border-box; */
  }
  .show-preview-btn {
    position: fixed;
    bottom: 0;
    right: 10px;
    opacity: 0.5;
  }
}
.editor-container.fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
}
</style>
