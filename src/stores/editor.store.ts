import { acceptHMRUpdate, defineStore } from 'pinia';
import { deleteImg, deleteVideo, uploadImg } from '@/service/file/file.request';
import { Msg } from '@/utils';

export interface IEditorDraftFilesState {
  manualCoverImgId: number | null;
  pendingImageIds: number[];
  pendingVideoIds: number[];
}

const useEditorStore = defineStore('editor', {
  state: (): IEditorDraftFilesState => ({
    manualCoverImgId: null,
    pendingImageIds: [],
    pendingVideoIds: [],
  }),
  actions: {
    /** 设置或清除手动上传的封面图片 ID */
    setManualCoverImgId(imgId: number | null) {
      this.manualCoverImgId = imgId;
      console.log('设置手动封面ID:', imgId);
    },
    /** 记录一张编辑器中新插入的图片 ID，用于发布失败时回收 */
    addPendingImageId(imgId: number) {
      this.pendingImageIds.push(imgId);
      console.log('添加待清理图片ID:', imgId, '当前列表:', this.pendingImageIds);
    },
    /** 记录一个编辑器中新上传的视频 ID（去重），用于发布失败时回收 */
    addPendingVideoId(videoId: number) {
      if (this.pendingVideoIds.includes(videoId)) {
        console.log('待清理视频ID已存在，跳过重复添加:', videoId);
        return;
      }

      this.pendingVideoIds.push(videoId);
      console.log('添加待清理视频ID:', videoId, '当前列表:', this.pendingVideoIds);
    },
    /** 一次性清空所有待清理文件状态（封面 + 图片 + 视频） */
    clearPendingFiles() {
      this.manualCoverImgId = null;
      this.pendingImageIds = [];
      this.pendingVideoIds = [];
      console.log('已清空所有待清理的文件（封面、图片、视频）');
    },
    /** 上传封面图片并自动记录其 ID，返回缩略图 URL */
    async uploadCoverAction(file: File) {
      const res = await uploadImg(file);
      if (res.code === 0) {
        const url = res.data[0].url;
        const imgId = res.data[0].result.insertId;
        console.log('手动上传封面成功:', url, imgId);
        this.setManualCoverImgId(imgId);
        this.addPendingImageId(imgId);
        return url.concat('?type=small');
      }

      Msg.showFail('封面上传失败');
      return undefined;
    },
    /** 批量删除所有待清理的孤儿图片（取消编辑 / 发布失败时调用） */
    async deletePendingImagesAction() {
      if (!this.pendingImageIds.length) {
        console.log('没有需要清理的孤儿图片');
        return;
      }
      const imagesToDelete = this.pendingImageIds.map((id) => ({ id }));
      console.log('清理已上传的孤儿图片:', imagesToDelete);
      const res = await deleteImg(imagesToDelete);
      if (res.code === 0) {
        this.pendingImageIds = [];
        console.log('孤儿图片清理成功');
      } else {
        console.error('孤儿图片清理失败');
      }
    },
    /** 批量删除所有待清理的孤儿视频（取消编辑 / 发布失败时调用） */
    async deletePendingVideosAction() {
      if (!this.pendingVideoIds.length) {
        console.log('没有需要清理的孤儿视频');
        return;
      }

      console.log('清理已上传的孤儿视频:', this.pendingVideoIds);
      const res = await deleteVideo(this.pendingVideoIds);
      if (res.code === 0) {
        this.pendingVideoIds = [];
        console.log('孤儿视频清理成功');
      } else {
        console.error('孤儿视频清理失败');
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEditorStore, import.meta.hot));
}

export default useEditorStore;
