<template>
  <div class="edit">
    <Editor :editData="editData" @update:content="(content) => (preview = content)" />
    <el-drawer title="管理您的文章" v-model="drawer" direction="ltr" draggable :size="400">
      <EditForm @formSubmit="formSubmit" :draft="preview" :editData="editData" :fileList="fileList" @setCover="handleSetCover" />
    </el-drawer>
    <el-button class="submit-btn" @click="drawer = true" :icon="Menu">提交</el-button>
  </div>
</template>

<script lang="ts" setup>
import { Menu, Memo } from '@element-plus/icons-vue';
import Editor from '@/components/wang-editor/Editor.vue';
import EditForm from './cpns/EditForm.vue';
import { Msg, emitter, isEmptyObj, LocalCache } from '@/utils';

import useArticleStore from '@/stores/article';
import type { UploadProps, UploadUserFile } from 'element-plus';

const route = useRoute();
const articleStore = useArticleStore();
const { article } = storeToRefs(articleStore);
const isEdit = computed(() => !!route.query.editArticleId);
const editData = computed(() => (isEdit.value ? article.value : {}));
const drawer = ref(false);
const preview = ref('');
const fileList = ref<UploadUserFile[]>([]);
// 通过路由是否传入待修改文章的id来判断是创建还是修改
onMounted(() => {
  // const isCreate = !isEmptyObj(editData.value);
  if (!isEdit.value) {
    console.log(`是创建文章------------------------`);
    emitter.on('uploadedImage', (payload: any) => {
      const { url, imgId } = payload;
      console.log('直接在编辑器中上传,第一张图片作为封面', payload);
      fileList.value.push({ url: url?.concat('?type=small'), name: 'img' });
    });
    window.addEventListener('beforeunload', (e) => {
      articleStore.deletePictrueAction();
    });
  } else {
    console.log(`是修改文章------------------------`, route.query.editArticleId);
    // 刷新后editData消失,重新获取,
    if (!isEmptyObj(editData.value)) {
      articleStore.getDetailAction(route.query.editArticleId as any, true);
    } else {
      articleStore.setupUploaded(editData.value);
    }
  }
});

watch(
  () => article.value,
  (newV) => {
    emitter.emit('updateEditorContent', newV.content);
  },
);

const handleSetCover = (file) => {
  // fileList.value.push(file);
  fileList.value.unshift(file);
  console.log('handleSetCover fileList.value', fileList.value);
};

const formSubmit = (editData: any) => {
  if (!editData.title) {
    Msg.showFail('请输入标题!');
  } else if (!preview.value) {
    Msg.showFail('请输入内容!');
  } else {
    if (!isEdit.value) {
      //创建文章------------------------------------------
      const sumbitPayload = { content: preview.value, ...editData };
      console.log('创建文章', sumbitPayload);
      articleStore.editAction(sumbitPayload);
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
}
</style>
