<template>
  <div class="edit">
    <Editor :editData="editData" @update:content="(content) => (preview = content)" />
    <el-drawer title="管理您的文章" v-model="drawer" direction="ltr" draggable :size="400">
      <EditForm @formSubmit="formSubmit" :draft="preview" :editData="editData" />
    </el-drawer>
    <el-button class="btn" @click="drawer = true" :icon="Menu">提交</el-button>
  </div>
</template>

<script lang="ts" setup>
import { Menu } from '@element-plus/icons-vue';
import Editor from '@/components/wang-editor/Editor.vue';
import EditForm from './cpns/EditForm.vue';
import { Msg } from '@/utils';

import useArticleStore from '@/stores/article';
const route = useRoute();
const articleStore = useArticleStore();
const { article } = storeToRefs(articleStore);
const isEdit = computed(() => !!route.query.editArticleId);
const editData = computed(() => (isEdit.value ? article.value : {}));
// 通过路由是否传入待修改文章的id来判断是创建还是修改
onMounted(() => {
  console.log(`是${!isEdit.value ? '创建' : '修改'}文章------------------------`, route.query.editArticleId);
});
const drawer = ref(false);
const preview = ref('');
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
@import '@/assets/css/editor';
.edit {
  .btn {
    position: fixed;
    bottom: 0;
    left: 0;
    border: 0;
  }

  :deep(.el-drawer) {
    background-color: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(1px);
  }
}
</style>
