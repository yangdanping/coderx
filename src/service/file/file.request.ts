import myRequest from '@/service';
import type { IDataType } from '@/service/types';

// 为了防止以后url改掉,用枚举定义url
enum UploadAPI {
  pictureUrl = '/upload/picture',
  avatarUrl = '/upload/avatar'
}

export function uploadPicture(data: FormData) {
  return myRequest.post<IDataType>({
    url: UploadAPI.pictureUrl,
    data
  });
}
