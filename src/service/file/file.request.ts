import myRequest from '@/service';
import type { IResData } from '@/service/types';
import type { IVideoStatusResponse } from '@/components/tiptap-editor/types/video-upload.type';

export function uploadImg(file: File) {
  const formData = new FormData();
  formData.append('img', file);
  return myRequest.post<IResData>({ url: '/img', data: formData });
}

export function uploadAvatar(payload) {
  const { action, file } = payload;
  console.log('uploadAvatar action, file', action, file);
  const fd = new FormData();
  fd.append('avatar', file);
  return myRequest.post<IResData>({ url: '/avatar', data: fd });
}

export function addImgForArticle(articleId, uploadedImgs) {
  return myRequest.post<IResData>({ url: `/img/${articleId}`, data: { uploaded: uploadedImgs } });
}

export function deleteImg(uploadedImgs) {
  return myRequest.delete<IResData>({ url: '/img', data: { uploaded: uploadedImgs } });
}

export function deleteOldAvatar(userId) {
  return myRequest.delete<IResData>({ url: `/avatar/${userId}` });
}

// ========== 视频上传相关 ==========

/**
 * 上传视频文件
 * @param file 视频文件
 * @returns Promise
 */
export function uploadVideo(file: File) {
  const formData = new FormData();
  formData.append('video', file);
  return myRequest.post<IResData>({
    url: '/video',
    data: formData,
    timeout: 120000, // 视频上传可能较慢,设置2分钟超时
  });
}

/**
 * 关联视频到文章
 * @param articleId 文章ID
 * @param videoIds 视频ID数组
 * @returns Promise
 */
export function addVideoForArticle(articleId: number, videoIds: number[]) {
  return myRequest.post<IResData>({ url: `/video/${articleId}`, data: { videoIds } });
}

/**
 * 删除视频文件
 * @param videoIds 视频ID数组
 * @returns Promise
 */
export function deleteVideo(videoIds: number[]) {
  return myRequest.delete<IResData>({ url: '/video', data: { videoIds } });
}

/**
 * 查询指定视频的转码状态与元数据
 *
 * 用于上传成功后的静默轮询，以及打开草稿时对历史 video 节点做状态复核。
 * 后端在 file 记录被孤儿清理后可能返回 `code !== 0` 或 `data: null`，调用方需自行处理。
 *
 * @param videoId 视频ID
 */
export function getVideoStatus(videoId: number) {
  return myRequest.get<IVideoStatusResponse>({ url: `/video/${videoId}` });
}
