<template>
  <div class="edit">
    <el-row>
      <el-col :span="12">
        <Editor :editData="editData" @update:content="upDateContent" />
      </el-col>
      <el-col :span="12">
        <div class="preview">
          <div class="title">
            <el-icon><Platform /></el-icon>预览
          </div>
          <div class="content editor-content-view" v-dompurify-html="preview"></div>
        </div>
      </el-col>
    </el-row>
    <el-drawer title="管理您的文章" draggable v-model="drawer" direction="ltr">
      <EditForm @formSubmit="formSubmit" :draft="preview" :editData="editData" />
    </el-drawer>
    <el-button class="btn" @click="drawer = true" :icon="Menu">提交</el-button>
  </div>
</template>

<script lang="ts" setup>
import { Menu, Platform } from '@element-plus/icons-vue';
import Editor from '@/components/wang-editor/Editor.vue';
import EditForm from './cpns/EditForm.vue';
import useArticleStore from '@/stores/article';
import { Msg } from '@/utils';
const route = useRoute();
const articleStore = useArticleStore();
const drawer = ref(false);
const preview = ref('');

const editData = computed<any>(() => route.query.editData);
const upDateContent = (content: string) => {
  preview.value = content;
};
const formSubmit = (payload: any) => {
  const { title } = payload;
  if (!title || !preview.value) {
    Msg.showFail('内容不能为空!');
  } else {
    if (!editData.value) {
      //创建文章------------------------------------------
      const sumbitPayload = { content: preview.value, ...payload };
      console.log('创建文章', sumbitPayload);
      articleStore.editAction(sumbitPayload);
    } else {
      //修改文章------------------------------------------
      console.log('修改文章');
      const { id } = editData.value;
      const updatedPayload = { articleId: id, content: preview.value, ...payload };
      console.log('修改文章', updatedPayload);
      articleStore.updateAction(updatedPayload);
    }
  }
};
</script>

<style lang="scss" scoped>
@import '../../assets/css/editor.scss';
.edit {
  .preview {
    .title {
      position: fixed;
      top: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background-image: linear-gradient(90deg, #222f3e, #42b983, transparent);
      color: #fff;
      font-size: 30px;
      height: 100px;
      width: 50vw;
    }
    .content {
      padding: 99px 0 0 0;
      height: 100vh;
      background: #fff;
      white-space: pre-wrap;
    }
  }

  .btn {
    position: fixed;
    bottom: 0;
    left: 0;
    border: 0;
  }
  .el-drawer {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}
</style>
