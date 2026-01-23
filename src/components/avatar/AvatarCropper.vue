<template>
  <el-dialog
    v-model="dialogVisible"
    title="头像裁切"
    width="560px"
    class="avatar-cropper-dialog"
    :z-index="999"
    :modal="true"
    :append-to-body="true"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    :show-close="true"
    @close="onCancel"
  >
    <div class="cropper-wrapper">
      <!-- cropperjs v2 Web Components -->
      <cropper-canvas ref="canvasRef" class="cropper-canvas" background>
        <!-- 图片可拖动和缩放 -->
        <cropper-image ref="imageRef" :src="imageSrc" alt="avatar" rotatable scalable skewable translatable />
        <!-- 半透明遮罩 -->
        <cropper-shade />
        <!-- 可调整大小的圆形选择框 -->
        <cropper-selection ref="selectionRef" initial-coverage="1" aspect-ratio="1" :movable="false" :resizable="true">
          <!-- 移动图片的 handle -->
          <cropper-handle action="move" theme-color="transparent" />
          <!-- 四角缩放控制点 - 必须在 selection 内部 -->
          <cropper-handle class="corner-handle corner-nw" action="nw-resize" />
          <cropper-handle class="corner-handle corner-ne" action="ne-resize" />
          <cropper-handle class="corner-handle corner-sw" action="sw-resize" />
          <cropper-handle class="corner-handle corner-se" action="se-resize" />
        </cropper-selection>
      </cropper-canvas>
    </div>

    <template #footer>
      <el-button class="confirm-btn" :loading="loading" @click="onConfirm"> 设置头像 </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import 'cropperjs'; // 自动注册所有 Web Components

// Props
const props = defineProps<{
  visible: boolean;
  imageSrc: string;
}>();

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean];
  confirm: [canvas: HTMLCanvasElement];
}>();

// 内部控制 dialog 显示状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

// Refs
const selectionRef = ref<any>(null);
const loading = ref(false);

// 确认裁切
const onConfirm = async () => {
  if (!selectionRef.value) return;

  loading.value = true;
  try {
    // cropperjs v2 的 $toCanvas() 返回 Promise<HTMLCanvasElement>
    const canvas = await selectionRef.value.$toCanvas({
      width: 200, // 输出 200x200 尺寸
      height: 200,
    });

    emit('confirm', canvas);
    emit('update:visible', false);
  } catch (error) {
    console.error('[AvatarCropper] 裁切失败:', error);
  } finally {
    loading.value = false;
  }
};

// 取消
const onCancel = () => {
  emit('update:visible', false);
};
</script>

<style lang="scss" scoped>
.cropper-wrapper {
  display: flex;
  justify-content: center;
  padding: 0;
  margin: 0;
}

.cropper-canvas {
  width: 100%;
  height: 450px;
  background: #ffffff;
  overflow: hidden;
}

// 四角缩放控制点定位
.corner-handle {
  position: absolute;
  width: 16px;
  height: 16px;
  z-index: 10;

  &.corner-nw {
    top: 8px;
    left: 8px;
  }
  &.corner-ne {
    top: 8px;
    right: 8px;
  }
  &.corner-sw {
    bottom: 8px;
    left: 8px;
  }
  &.corner-se {
    bottom: 8px;
    right: 8px;
  }
}

// 确认按钮 - 100% 宽度绿色按钮
.confirm-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

// cropperjs v2 样式覆盖 - 白色背景
:deep(cropper-canvas) {
  --cropper-canvas-background: #ffffff;
}

// 图片自动填充 canvas 宽度（避免两侧出现空白）
:deep(cropper-image) {
  min-width: 100%;
  min-height: 100%;
  width: auto;
  height: auto;
  object-fit: cover;
}

// 圆形选择框 - 虚线边框
:deep(cropper-selection) {
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.6) !important;
  outline: none !important;
  box-shadow: none !important;
}

// 遮罩层 - 圆形镂空效果
:deep(cropper-shade) {
  --cropper-shade-color: rgba(0, 0, 0, 0.6);
}

// 四角控制点样式
:deep(cropper-handle[action$='-resize']) {
  width: 14px;
  height: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(0, 0, 0, 0.5);
  border-radius: 50%;
}

:deep(cropper-handle[action='nw-resize']),
:deep(cropper-handle[action='se-resize']) {
  cursor: nwse-resize;
}

:deep(cropper-handle[action='ne-resize']),
:deep(cropper-handle[action='sw-resize']) {
  cursor: nesw-resize;
}

// 移动 handle 样式 - 显示移动图标
:deep(cropper-handle[action='move']) {
  cursor: move;
}
</style>

<style lang="scss">
// 全局样式 - 弹窗主题（白色背景）
.avatar-cropper-dialog {
  background: #ffffff !important;
  overflow: hidden;
  --el-dialog-bg-color: #ffffff;
  --el-dialog-padding-primary: 0;

  .el-dialog__header {
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    padding: 16px 20px;
    margin: 0;

    .el-dialog__title {
      color: #1f2937;
      font-size: 16px;
      font-weight: 600;
    }

    .el-dialog__headerbtn {
      top: 6px;
      right: 6px;

      .el-dialog__close {
        color: #6b7280;
        font-size: 20px;

        &:hover {
          color: #1f2937;
        }
      }
    }
  }

  .el-dialog__body {
    padding: 0 !important;
    margin: 0 !important;
    background: #ffffff;
  }

  .el-dialog__footer {
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
    padding: 16px 20px;
    margin: 0;
  }
}
</style>
