<template>
  <div class="edit">
    <el-row>
      <el-col :span="12">
        <Editor @update:content="upDateContent" />
      </el-col>
      <el-col :span="12">
        <div class="preview">
          <div class="title">
            <el-icon><Platform /></el-icon>预览
          </div>
          <div class="content el-tiptap-editor__content" v-html="preview"></div>
        </div>
      </el-col>
    </el-row>
    <el-button class="btn" @click="drawer = true" :icon="Menu">提交</el-button>
    <el-drawer title="管理您的文章" :draggable="true" v-model="drawer" direction="ltr">
      <!-- <EditForm @formSubmit="formSubmit" :draft="preview" :editData="editData" /> -->
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import NavBar from '@/components/navbar/NavBar.vue';
import Editor from '@/components/wang-editor/Editor.vue';
import { ElRow, ElCol, ElDrawer } from 'element-plus';
import { Menu, Platform } from '@element-plus/icons-vue';

const drawer = ref(false);
const preview = ref('');
const upDateContent = (content: string) => {
  preview.value = content;
};
</script>

<style lang="scss" scoped>
.edit {
  width: 100%;
  .btn {
    position: fixed;
    bottom: 0;
    left: 0;
    border: 0;
    // z-index: 9999;
  }
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
      height: 99px;
      width: 50vw;
    }
    .content {
      padding: 99px 0 0 0;
      height: 100vh;
      background: #fff;
      white-space: pre-wrap;
    }
  }

  .el-drawer {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}
</style>
