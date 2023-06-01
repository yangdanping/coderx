import myRequest from '@/service';
import type { IDataType } from '@/service/types';
const urlHead = '/upload';

export function uploadPicture(file: File) {
  const formData = new FormData();
  formData.append('picture', file);
  return myRequest.post<IDataType>({
    url: `${urlHead}/picture`,
    data: formData
  });
}

export function uploadAvatar(payload) {
  const { action, file } = payload;
  console.log('uploadAvatar action, file', action, file);
  const fd = new FormData();
  fd.append('avatar', file);
  return myRequest.post<IDataType>({
    url: `${urlHead}/${action}`,
    data: fd
  });
}

export function addPictureForArticle(articleId, uploaded) {
  return myRequest.post<IDataType>({
    url: `${urlHead}/picture/${articleId}`,
    data: { uploaded }
  });
}

export function deletePicture(uploaded) {
  return myRequest.delete<IDataType>({
    url: `${urlHead}/picture`,
    data: { uploaded }
  });
}

export function deleteOldAvatar(userId) {
  return myRequest.delete<IDataType>({
    url: `${urlHead}/avatar/${userId}`
  });
}
