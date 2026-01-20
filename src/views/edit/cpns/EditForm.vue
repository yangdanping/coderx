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
          :http-request="coverUpLoad as UploadRequestHandler"
          :before-upload="beforeCoverUpload"
          :show-file-list="false"
          class="cover-uploader"
        >
          <template #tip>
            <div class="tip">
              图片大小不能超过2MB<br />
              <span style="color: #909399; font-size: 12px">
                {{ isEdit ? '编辑时不上传新封面则保留原封面' : '未手动上传则使用第一张图片作为封面' }}
              </span>
            </div>
          </template>
          <img v-if="fileList.length" :src="fileList[0]?.url" class="cover" />
          <div class="uoload-icon">
            <el-icon><Plus /></el-icon>
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
import useArticleStore from '@/stores/article.store';
import { ElMessageBox } from 'element-plus';
import { LocalCache, Msg, isEmptyObj, extractImagesFromHtml } from '@/utils';
import { Plus } from 'lucide-vue-next';
const router = useRouter();
const articleStore = useArticleStore();
const { tags } = storeToRefs(articleStore);

import type { IArticle } from '@/stores/types/article.result';
import type { UploadRequestHandler } from 'element-plus';
import type { UploadUserFile } from 'element-plus';
const {
  editData = {},
  fileList = [],
  draft = '',
} = defineProps<{
  editData?: IArticle;
  fileList?: UploadUserFile[];
  draft?: string;
}>();
let form = reactive({ title: '', tags: [] as any[] });

const handleFileChange = (file, files) => {
  console.log('handleFileChange', file, files);
};
const emit = defineEmits(['formSubmit', 'setCover']);

onMounted(() => {
  articleStore.getTagsAction();

  // 1. 检查是否有草稿（创建模式下的草稿）
  const draft = LocalCache.getCache('draft');
  if (draft) {
    console.log('加载草稿:', draft);
    const { title, tags, fileList = [] } = draft;
    form.title = title;
    form.tags = tags;
    if (fileList.length) {
      emit('setCover', { url: fileList[0].url, name: 'img' });
    }
    return;
  }

  // 2. 编辑模式 - 加载已有文章数据
  if (isEmptyObj(editData)) {
    console.log('编辑模式 - 加载文章数据:', editData);
    const { title, tags, images } = editData;
    form.title = title || '';

    // 设置标签
    if (tags && tags.length) {
      form.tags = tags.map((tag) => tag.name);
    }

    // 设置封面预览
    if (images && images.length) {
      const url = images[0]?.url?.concat('?type=small');
      emit('setCover', { url, name: 'img' });
    }
    return;
  }

  // 3. 创建模式 - 新建文章
  console.log('创建模式 - 新建文章');
});

const beforeCoverUpload = (file) => {
  const isLt2M = file.size / 1024 / 1024 < 2;
  !isLt2M && Msg.showInfo('上传图片大小不能超过 2MB!');
  return isLt2M;
};

// 手动上传封面
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
  };
  emit('formSubmit', articleDraft);
};

const route = useRoute();
const isEdit = computed(() => !!route.query.editArticleId);
// 取消修改/创建
const goBack = () => {
  ElMessageBox.confirm(`是否${isEdit.value ? '取消修改' : '退出并保存草稿'}`, '提示', {
    type: 'info',
    distinguishCancelAndClose: true,
    confirmButtonText: `${isEdit.value ? '取消修改' : '保存退出'}`,
    cancelButtonText: `${isEdit.value ? '再想想' : '不保存退出'}`,
  })
    .then(() => {
      if (!isEdit.value) {
        // 创建模式：保存草稿
        let draftFileList = fileList;

        // 如果没有手动上传封面，从内容中提取第一张图片
        if (!fileList.length && draft) {
          const imageUrls = extractImagesFromHtml(draft);
          if (imageUrls.length > 0) {
            draftFileList = [{ url: imageUrls[0]?.concat('?type=small'), name: 'img' }];
            console.log('从内容提取草稿封面:', imageUrls[0]);
          }
        }

        // 保存草稿时同时保存已上传文件的 ID，防止被定时任务误清理
        const draftObj = {
          ...form,
          draft: draft,
          fileList: draftFileList,
          pendingImageIds: [...articleStore.pendingImageIds],
          pendingVideoIds: [...articleStore.pendingVideoIds],
        };
        console.log('保存草稿:', draftObj);
        LocalCache.setCache('draft', draftObj);
        Msg.showSuccess('已保存并退出文章编辑!');
        router.push('/article');
      } else {
        // 编辑模式：直接返回
        console.log('取消修改，清理孤儿文件');
        // 清空手动上传的封面ID
        articleStore.setManualCoverImgId(null);
        // 清理编辑过程中上传的孤儿图片和视频
        articleStore.deletePendingImagesAction();
        articleStore.deletePendingVideosAction();
        router.back();
      }
    })
    .catch((action) => {
      if (action === 'cancel' && !isEdit.value) {
        // 不保存草稿，直接退出，清理孤儿图片和视频
        console.log('不保存草稿，直接退出，清理所有孤儿文件');
        LocalCache.removeCache('draft');
        router.push('/article').then(() => {
          articleStore.deletePendingImagesAction();
          articleStore.deletePendingVideosAction();
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
    border: 1px dashed #eee;
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
