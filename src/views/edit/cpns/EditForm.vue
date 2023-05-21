<template>
  <div class="edit-form">
    <el-form :model="form">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="50" show-word-limit clearable></el-input>
      </el-form-item>
      <el-form-item label="标签" prop="tags">
        <el-select v-model="form.tags" :multiple-limit="5" placeholder="添加文章标签(最多5个)" multiple filterable default-first-option clearable>
          <span class="tip">你还能添加{{ 5 - form.tags.length }}个标签</span>
          <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.name ?? ''"> </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="封面" prop="cover">
        <el-upload
          :on-change="handleFileChange"
          :http-request="(coverUpLoad as UploadRequestHandler)"
          :before-upload="beforeCoverUpload"
          :show-file-list="false"
          class="cover-uploader"
        >
          <template #tip>
            <div class="tip">图片大小不能超过2MB(未手动上传则默认文章中第一次上传的图片作为封面)</div>
          </template>
          <img v-if="fileList.length" :src="fileList[0].url" class="cover" />
          <div class="uoload-icon">
            <el-icon><IPlus /></el-icon>
          </div>
        </el-upload>
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
import { LocalCache, Msg, isEmptyObj, emitter } from '@/utils';
import type { UploadRequestHandler } from 'element-plus';
const router = useRouter();
const articleStore = useArticleStore();
const { tags, uploaded } = storeToRefs(articleStore);

import type { IArticle } from '@/stores/types/article.result';
import type { ElForm, ElInput } from 'element-plus';
import type { UploadProps, UploadUserFile } from 'element-plus';
const props = defineProps({
  editData: {
    type: Object as PropType<IArticle>,
    default: () => {}
  },
  fileList: {
    type: Array as PropType<UploadUserFile[]>,
    default: () => {}
  },
  draft: {
    type: String,
    default: ''
  }
});
let form = reactive({ title: '', tags: [] as any[] });

const oldTags = ref<any[]>([]);

const handleFileChange = (file, files) => {
  console.log('handleFileChange', file, files);
};
const emit = defineEmits(['formSubmit', 'setCover']);

onMounted(() => {
  articleStore.getTagsAction();
  if (isEmptyObj(props.editData)) {
    console.log('编辑文章', props.editData);
    const { title, tags, images } = props.editData;
    if (images) {
      const url = images[0].url?.concat('?type=small');
      emit('setCover', { url, name: 'img' });
    }
    form.title = title!;
    tags?.forEach((tag) => oldTags.value.push(tag.name));
    tags?.forEach((tag) => form.tags.push(tag.name));
    console.log('编辑文章 editForm onMounted拿到form', form);
  } else if (LocalCache.getCache('draft')) {
    form = reactive(LocalCache.getCache('draft'));
    console.log('editForm不存在props.editData,在缓存中拿', form);
  }
});

const beforeCoverUpload = (file) => {
  const isLt2M = file.size / 1024 / 1024 < 2;
  !isLt2M && Msg.showInfo('上传图片大小不能超过 2MB!');
  return isLt2M;
};

const coverUpLoad = (content) => {
  console.log('coverUpLoad', content.file);
  articleStore.uploadCoverAction(content.file).then((url: string) => {
    emit('setCover', { url, name: 'img' });
  });
};

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
        router.push('/article').then(() => {
          articleStore.deletePictrueAction();
        });
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

:deep(.cover-uploader) {
  .el-upload {
    border: 1px dashed #ccc;
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: var(--el-transition-duration-fast);
    width: 320px;
    height: 320px;
    .uoload-icon {
      position: absolute;
      top: 0;
      text-align: center;
      font-size: 50px;
      width: 320px;
      height: 320px;
      line-height: 320px;
      background: rgba(0, 0, 0, 0.2);
      color: #fff;
      overflow: hidden;
      transition: all 0.3s;
      opacity: 0;
      user-select: none;
      &:hover {
        opacity: 1;
      }
    }
    &:hover {
      border-color: var(--el-color-primary);
    }
  }
  .tip {
    font-size: 10px;
    color: #777;
  }
}
</style>
