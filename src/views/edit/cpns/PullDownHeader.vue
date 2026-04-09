<template>
  <div class="pull-down-header" :class="{ 'is-pulled': isPulled }">
    <div class="header-content" v-show="isPulled">
      <!-- 左侧：标题输入（渐变遮罩 + 水平滚动） -->
      <div class="title-section">
        <div class="title-input-wrapper">
          <input type="text" :value="modelValue" @input="handleInput" placeholder="在此输入标题..." class="title-input" ref="inputRef" maxlength="50" />
        </div>
      </div>

      <!-- 虚线分隔符（桌面垂直 / 移动端水平） -->
      <div class="dashed-divider"></div>

      <!-- 右侧：标签 + 封面 + 提交 + 退出 -->
      <div class="controls-section">
        <div class="controls-left">
          <el-select
            v-model="form.tags"
            :multiple-limit="5"
            placeholder="选择标签"
            multiple
            filterable
            default-first-option
            clearable
            size="small"
            collapse-tags
            collapse-tags-tooltip
            class="tags-select"
          >
            <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.name ?? ''" />
          </el-select>

          <div class="cover-upload-wrapper">
            <el-tooltip :content="coverTooltip" placement="bottom" :show-after="300">
              <button class="action-btn cover-btn" @click="triggerCoverUpload" type="button" role="button">
                <ImagePlus :size="16" />
              </button>
            </el-tooltip>

            <div class="cover-thumb-container" v-if="coverFileList.length">
              <img :src="coverFileList[0]?.url" class="cover-thumb" @click="triggerCoverUpload" role="button" />
              <button class="remove-cover-btn" @click.stop="removeCover" type="button" title="移除封面">
                <X :size="12" />
              </button>
            </div>

            <input type="file" ref="coverInputRef" @change="handleCoverFileSelect" accept="image/*" style="display: none" />
          </div>
        </div>

        <div class="controls-right">
          <el-tooltip :content="isEdit ? '修改' : '创建'" placement="bottom" :show-after="300">
            <button class="action-btn submit-action-btn" @click="onSubmit" type="button" role="button">
              <Check :size="16" />
            </button>
          </el-tooltip>

          <el-tooltip content="退出编辑" placement="bottom" :show-after="300">
            <button class="action-btn exit-action-btn" @click="goBack" type="button" role="button">
              <LogOut :size="16" />
            </button>
          </el-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Check, LogOut, ImagePlus, X } from 'lucide-vue-next';
import useArticleStore from '@/stores/article.store';
import useEditorStore from '@/stores/editor.store';
import { ElMessageBox } from 'element-plus';
import { LocalCache, Msg, isEmptyObj, extractImagesFromHtml } from '@/utils';
import type { IArticle } from '@/stores/types/article.result';
import type { UploadUserFile } from 'element-plus';

interface Props {
  modelValue: string;
  isPulled: boolean;
  editData?: IArticle | Record<string, any>;
  draft?: string;
}

const props = withDefaults(defineProps<Props>(), {
  editData: () => ({}),
  draft: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'update:isPulled', value: boolean): void;
  (e: 'formSubmit', data: { title: string; tags: string[] }): void;
}>();

const route = useRoute();
const router = useRouter();
const articleStore = useArticleStore();
const editorStore = useEditorStore();
const { tags } = storeToRefs(articleStore);

const isEdit = computed(() => !!route.query.editArticleId);
const inputRef = ref<HTMLInputElement | null>(null);
const coverInputRef = ref<HTMLInputElement | null>(null);
const form = reactive({ tags: [] as string[] });
const coverFileList = ref<UploadUserFile[]>([]);

const coverTooltip = computed(() => (coverFileList.value.length ? '替换封面' : '上传封面'));

const handleInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
};

watch(
  () => props.isPulled,
  (val) => {
    if (val) setTimeout(() => inputRef.value?.focus(), 300);
  },
);

onMounted(() => {
  articleStore.getTagsAction();

  const draftData = LocalCache.getCache('draft');
  if (draftData && !isEdit.value) {
    console.log('加载草稿:', draftData);
    if (draftData.tags) form.tags = draftData.tags;
    if (draftData.fileList?.length) {
      coverFileList.value = [{ url: draftData.fileList[0].url, name: 'img' }];
    }
    return;
  }

  if (props.editData && isEmptyObj(props.editData)) {
    console.log('编辑模式 - 加载文章数据:', props.editData);
    const { tags: articleTags, images } = props.editData as IArticle;
    if (articleTags?.length) {
      form.tags = articleTags.map((tag: any) => tag.name);
    }
    if (images?.length) {
      const url = images[0]?.url?.concat('?type=small');
      coverFileList.value = [{ url, name: 'img' }];
    }
  }
});

const triggerCoverUpload = () => coverInputRef.value?.click();

const removeCover = () => {
  coverFileList.value = [];
  if (coverInputRef.value) coverInputRef.value.value = '';
};

const handleCoverFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.size / 1024 / 1024 >= 2) {
    Msg.showInfo('上传图片大小不能超过 2MB!');
    return;
  }

  editorStore.uploadCoverAction(file).then((url) => {
    if (url) coverFileList.value = [{ url, name: 'img' }];
  });

  if (coverInputRef.value) coverInputRef.value.value = '';
};

const onSubmit = () => {
  emit('formSubmit', { title: props.modelValue, tags: form.tags });
};

const goBack = () => {
  ElMessageBox.confirm(`是否${isEdit.value ? '取消修改' : '退出并保存草稿'}`, '提示', {
    type: 'info',
    distinguishCancelAndClose: true,
    confirmButtonText: isEdit.value ? '取消修改' : '保存退出',
    cancelButtonText: isEdit.value ? '再想想' : '不保存退出',
  })
    .then(() => {
      if (!isEdit.value) {
        let draftFileList: UploadUserFile[] = coverFileList.value;

        if (!coverFileList.value.length && props.draft) {
          const imageUrls = extractImagesFromHtml(props.draft);
          if (imageUrls.length > 0) {
            draftFileList = [{ url: imageUrls[0]?.concat('?type=small'), name: 'img' }];
          }
        }

        const draftObj = {
          title: props.modelValue,
          tags: form.tags,
          draft: props.draft,
          fileList: draftFileList,
          pendingImageIds: [...editorStore.pendingImageIds],
          pendingVideoIds: [...editorStore.pendingVideoIds],
        };
        console.log('保存草稿:', draftObj);
        LocalCache.setCache('draft', draftObj);
        Msg.showSuccess('已保存并退出文章编辑!');
        router.push('/article');
      } else {
        console.log('取消修改，清理孤儿文件');
        editorStore.setManualCoverImgId(null);
        editorStore.deletePendingImagesAction();
        editorStore.deletePendingVideosAction();
        router.back();
      }
    })
    .catch((action) => {
      if (action === 'cancel' && !isEdit.value) {
        console.log('不保存草稿，直接退出，清理所有孤儿文件');
        LocalCache.removeCache('draft');
        router.push('/article').then(() => {
          editorStore.deletePendingImagesAction();
          editorStore.deletePendingVideosAction();
        });
      }
    });
};
</script>

<script lang="ts">
export default {
  name: 'PullDownHeader',
};
</script>

<style lang="scss" scoped>
.pull-down-header {
  position: relative;
  width: 100%;
  height: 0;
  overflow: hidden;
  transition: height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
  background: var(--bg-color-primary);
  z-index: 103;

  &.is-pulled {
    height: var(--navbarHeight, 60px);

    @media (max-width: 768px) {
      height: calc(var(--navbarHeight, 60px) * 2);
    }
  }
}

.header-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 6px 16px;
  }
}

.title-section {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  height: 100%;

  @media (max-width: 768px) {
    width: 100%;
    flex: none;
    height: auto;
    padding: 4px 0;
  }
}

.title-input-wrapper {
  width: 100%;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, black 80%, transparent 100%);
  mask-image: linear-gradient(to right, black 80%, transparent 100%);

  .title-input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 28px;
    font-weight: bold;
    color: var(--text-primary);
    padding: 0;
    overflow-x: auto;
    white-space: nowrap;

    &::-webkit-scrollbar {
      display: none;
    }
    scrollbar-width: none;

    &::placeholder {
      color: var(--el-text-color-placeholder, #c9cdd4);
    }
  }
}

.dashed-divider {
  width: 0;
  align-self: stretch;
  border-left: 2px dashed var(--el-border-color);
  margin: 10px 20px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: auto;
    height: 0;
    border-left: none;
    border-top: 2px dashed var(--el-border-color);
    margin: 4px 0;
    align-self: stretch;
  }
}

.controls-section {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 768px) {
    width: 100%;
    flex: none;
  }
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 12px;
}

.tags-select {
  flex: 1;
  min-width: 0;
  max-width: 220px;

  :deep(.el-select__wrapper) {
    box-shadow: none !important;
    background-color: transparent !important;
    padding-left: 0;

    &:hover,
    &.is-focus {
      box-shadow: none !important;
    }
  }

  :deep(.el-select__placeholder) {
    color: var(--el-text-color-placeholder, #c9cdd4);
    font-size: 14px;
  }

  @media (max-width: 768px) {
    max-width: none;
  }
}

.cover-upload-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  .cover-thumb-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    .cover-thumb {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      object-fit: cover;
      border: 1px solid var(--el-border-color);
      transition: border-color 0.2s;

      &:hover {
        border-color: var(--el-color-primary);
      }
    }

    .remove-cover-btn {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--el-color-danger-light-9);
      color: var(--el-color-danger);
      border: 1px solid var(--el-color-danger-light-5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      cursor: pointer;
      opacity: 0;
      transition: all 0.2s;
      z-index: 2;

      &:hover {
        background: var(--el-color-danger-light-7);
        border-color: var(--el-color-danger);
      }
    }

    &:hover .remove-cover-btn {
      opacity: 1;
    }
  }
}

.action-btn {
  min-width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: all 0.2s;
  flex-shrink: 0;

  @media (max-width: 768px) {
    min-width: 40px;
    height: 40px;
  }
}

.cover-btn {
  color: var(--el-text-color-regular);
  border-color: var(--el-border-color);
  background: var(--el-fill-color-blank);

  &:hover {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
  }
}

.submit-action-btn {
  color: var(--el-color-success);
  border-color: var(--el-color-success-light-5);
  background: var(--el-color-success-light-9);

  &:hover {
    background: var(--el-color-success-light-7);
    border-color: var(--el-color-success);
  }
}

.exit-action-btn {
  color: var(--el-color-danger);
  border-color: var(--el-color-danger-light-5);
  background: var(--el-color-danger-light-9);

  &:hover {
    background: var(--el-color-danger-light-7);
    border-color: var(--el-color-danger);
  }
}
</style>
