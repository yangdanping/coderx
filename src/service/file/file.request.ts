import myRequest from '@/service';
import type { IDataType } from '@/service/types';
const urlHead = '/upload';

export function uploadPicture(data: FormData) {
  return myRequest.post<IDataType>({
    url: `${urlHead}/picture`,
    data
  });
}

export function uploadAvatar(payload) {
  const { action, file } = payload;
  const fd = new FormData();
  fd.append('avatar', file);
  return myRequest.post({
    url: `${urlHead}/${action}`,
    data: fd
  });
}

export function addPictureForArticle(articleId, uploaded) {
  return myRequest.post({
    url: `${urlHead}/picture/${articleId}`,
    data: { uploaded }
  });
}
