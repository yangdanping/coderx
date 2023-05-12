<template>
  <div class="edit-form">
    <el-form :model="form" ref="editFormRef">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="50" show-word-limit clearable></el-input>
      </el-form-item>
      <el-form-item label="标签" prop="tags">
        <el-select v-model="form.tags" :multiple-limit="5" placeholder="添加文章标签(最多5个)" multiple filterable default-first-option clearable>
          <span class="tip">你还能添加{{ 5 - form.tags.length }}个标签</span>
          <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.name ?? ''"> </el-option>
        </el-select>
      </el-form-item>
      <!-- ---------------------------------------------------------------------------------- -->
      <el-form-item>
        <el-button @click="onSubmit" type="primary">{{ isEdit ? '修改' : '创建' }}</el-button>
      </el-form-item>
      <el-form-item>
        <el-button @click="goBack">退出{{ isEdit ? '修改' : '编辑' }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script lang="ts" setup>
import useArticleStore from '@/stores/article';
import { ElMessageBox } from 'element-plus';
import { LocalCache, Msg, isEmptyObj } from '@/utils';

const router = useRouter();
const articleStore = useArticleStore();
const { tags } = storeToRefs(articleStore);

import type { IArticle } from '@/stores/types/article.result';
import type { ElForm, ElInput } from 'element-plus';

const props = defineProps({
  editData: {
    type: Object as PropType<IArticle>,
    default: () => {}
  },
  draft: {
    type: String,
    default: ''
  }
});
let form = reactive({ title: '', tags: [] as any[] });
const editFormRef = ref<InstanceType<typeof ElForm>>();

const oldTags = ref<any[]>([]);

onMounted(() => {
  articleStore.getTagsAction();
  if (isEmptyObj(props.editData)) {
    console.log('editForm存在props.editData', props.editData);
    const { title, tags } = props.editData;
    form.title = title!;
    tags?.forEach((tag) => oldTags.value.push(tag.name));
    tags?.forEach((tag) => form.tags.push(tag.name));
    console.log('editForm onMounted拿到form', form);
  } else if (LocalCache.getCache('draft')) {
    form = reactive(LocalCache.getCache('draft'));
    console.log('editForm不存在props.editData,在缓存中拿', form);
  }
});

const emit = defineEmits(['formSubmit']);
const onSubmit = () => {
  // 在外界验证
  const articleDraft = {
    title: form.title,
    tags: form.tags,
    oldTags: oldTags.value
  };
  emit('formSubmit', articleDraft);
};

const route = useRoute();
const isEdit = computed(() => !!route.query.editArticleId);
// 取消修改
const goBack = () => {
  ElMessageBox.confirm(`是否${isEdit.value ? '取消修改' : '退出并保存草稿'}`, '提示', {
    type: 'info',
    distinguishCancelAndClose: true,
    confirmButtonText: `${isEdit.value ? '取消修改' : '保存退出'}`,
    cancelButtonText: `${isEdit.value ? '再想想' : '不保存退出'}`
  })
    .then(() => {
      if (!isEdit.value) {
        router.push('/article').then(() => {
          const draftObj = { ...form, draft: props.draft };
          console.log('保存并退出文章编辑!!!!!!!!', draftObj);
          LocalCache.setCache('draft', draftObj);
          Msg.showSuccess('已保存并退出文章编辑!');
        });
      } else {
        router.back();
      }
    })
    .catch((action) => {
      if (action === 'cancel' && !isEdit.value) {
        LocalCache.removeCache('draft');
        LocalCache.removeCache('pictures');
        router.push('/article');
      }
    });
};
</script>

<style lang="scss" scoped>
.el-form {
  .el-select,
  .el-button {
    width: 100%;
  }
}
.tip {
  display: flex;
  justify-content: center;
  color: #c9cdd4;
}
</style>
