<template>
  <div>
    <div class="editor-container">
      <Toolbar class="toolbar" :editor="editorRef" :defaultConfig="toolbarConfig" :mode="mode" />
      <Editor
        :style="{ height, 'overflow-y': 'hidden' }"
        class="editor"
        v-model="valueHtml"
        :defaultConfig="editorConfig"
        @onChange="handleChanged"
        @onCreated="handleCreated"
        :mode="mode"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import { DomEditor } from '@wangeditor/editor';
import { uploadPicture } from '@/service/file/file.request';
import '@wangeditor/editor/dist/css/style.css'; // 引入 css

import type { IToolbarConfig, IEditorConfig } from '@wangeditor/editor';
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

type InsertFnType = (url: string, alt: string, href: string) => void;
const editorRef = shallowRef();
const valueHtml = ref('<p>请输入内容...</p>');
const mode = ref('default');

// 配置
const toolbarConfig: Partial<IToolbarConfig> = {};
const editorConfig: Partial<IEditorConfig> = {
  placeholder: '请输入内容...',
  MENU_CONF: {
    uploadImage: {
      // 自定义上传
      async customUpload(file: File, insertFn: InsertFnType) {
        const fd = new FormData();
        fd.append('picture', file);
        console.log('FormData picture', fd);
        // file 即选中的文件
        // 自己实现上传,并得到图片 url alt href,最后插入图片
        const res = await uploadPicture(fd);
        console.log('customUpload res', res);
        const url = res.data[0].url;
        const href = res.data[0].url;
        insertFn(url, '', href);
      }
    }
  }
};

// onMounted(() => {
//   setTimeout(() => (valueHtml.value = '<p>模拟 Ajax 异步设置内容</p>'), 1000);
// });

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});

const handleCreated = (editor: any) => {
  editorRef.value = editor; // 记录 editor 实例，重要！
  const toolbar = DomEditor.getToolbar(editor);
  console.log('toolbar', toolbar);
  console.log('editorRef.value', editorRef.value);
};
const handleChanged = (editor: any) => {
  console.log('handleChanged', valueHtml.value);
};
const emit = defineEmits(['update:content']);
watch(
  () => valueHtml.value,
  (newV) => {
    emit('update:content', newV);
  },
  { deep: true }
); //监听分页数据变化
</script>

<style lang="scss" scoped>
.editor-container {
  border: 1px solid #ccc;
  .toolbar {
    border-bottom: 1px solid #ccc;
  }
}
</style>
