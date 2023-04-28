<template>
  <div class="edit-form">
    <el-form :rules="rules" :model="form" ref="editForm" label-width="80px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" clearable></el-input>
      </el-form-item>
      <el-form-item label="标签" prop="tags">
        <el-select v-model="form.tags" multiple filterable default-first-option clearable :multiple-limit="5" placeholder="添加文章标签(最多5个)">
          <span class="tip">你还能添加{{ 5 - form.tags.length }}个标签</span>
          <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.name ?? ''"> </el-option>
        </el-select>
      </el-form-item>
      <!-- ---------------------------------------------------------------------------------- -->
      <el-form-item class="btn">
        <el-button type="primary" @click="onSubmit">{{ editData ? '修改' : '创建' }}</el-button>
        <el-button @click="goBack">退出{{ editData ? '修改' : '编辑' }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import { LocalCache, Msg } from '@/utils';
import { storeToRefs } from 'pinia';
import useArticleStore from '@/stores/article';
const router = useRouter();
const articleStore = useArticleStore();
const { tags } = storeToRefs(articleStore);
const props = defineProps({
  editData: {
    type: Object,
    default: () => {}
  },
  draft: {
    type: String,
    default: ''
  }
});
let form = reactive({ title: '', tags: [] as any[] });
const rules = ref({
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }]
});
const oldTags = ref<any[]>([]);

onMounted(() => {
  articleStore.getTagsAction();
  if (props.editData) {
    console.log('editForm存在props.editData', props.editData);
    const { title, tags } = props.editData;
    form.title = title;
    tags?.forEach((tag) => oldTags.value.push(tag.name));
    tags?.forEach((tag) => form.tags.push(tag.name));
    console.log('editForm onMounted拿到form', form);
  } else if (LocalCache.getCache('draft')) {
    console.log('editForm不存在props.editData,在缓存中拿', LocalCache.getCache('draft'));
    form = LocalCache.getCache('draft');
  }
});

const emit = defineEmits(['formSubmit']);
const onSubmit = () => {
  const articleDraft = {
    title: form.title,
    tags: form.tags,
    oldTags: oldTags.value
  };
  emit('formSubmit', articleDraft);
};
// 取消修改
const goBack = () => {
  ElMessageBox.confirm(`是否${props.editData ? '取消修改' : '退出并保存草稿'}`, '提示', {
    type: 'info',
    distinguishCancelAndClose: true,
    confirmButtonText: `${props.editData ? '取消修改' : '保存退出'}`,
    cancelButtonText: `${props.editData ? '再想想' : '不保存退出'}`
  })
    .then(() => {
      if (!props.editData) {
        router.push('/article');
        const draftObj = { ...form, draft: props.draft };
        console.log('保存并退出文章编辑!!!!!!!!', draftObj);
        LocalCache.setCache('draft', draftObj);
        Msg.showSuccess('已保存并退出文章编辑!');
      } else {
        router.back();
      }
    })
    .catch((action) => {
      if (action === 'cancel' && !props.editData) {
        LocalCache.removeCache('draft');
        LocalCache.removeCache('pictures');
        router.push('/article');
      }
    });
};
</script>

<style lang="scss" scoped>
.el-form {
  padding: 0 10px;
  .btn {
    display: flex;
    justify-content: space-around;
  }
}
.tip {
  display: flex;
  justify-content: center;
  color: #c9cdd4;
}
</style>
