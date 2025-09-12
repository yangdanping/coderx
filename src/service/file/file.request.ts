import myRequest from '@/service';
import type { IResData } from '@/service/types';
const urlHead = '/upload';

export function uploadPicture(file: File) {
  const formData = new FormData();
  formData.append('picture', file);
  return myRequest.post<IResData>({
    url: `${urlHead}/picture`,
    data: formData,
  });
}

export function uploadAvatar(payload) {
  const { action, file } = payload;
  console.log('uploadAvatar action, file', action, file);
  const fd = new FormData();
  fd.append('avatar', file);
  return myRequest.post<IResData>({
    url: `${urlHead}/${action}`,
    data: fd,
  });
}

export function addPictureForArticle(articleId, uploaded) {
  return myRequest.post<IResData>({
    url: `${urlHead}/picture/${articleId}`,
    data: { uploaded },
  });
}

export function deletePicture(uploaded) {
  return myRequest.delete<IResData>({
    url: `${urlHead}/picture`,
    data: { uploaded },
  });
}

export function deleteOldAvatar(userId) {
  return myRequest.delete<IResData>({
    url: `${urlHead}/avatar/${userId}`,
  });
}
