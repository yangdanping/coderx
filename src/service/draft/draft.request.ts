import type { AxiosRequestConfig, AxiosResponse } from 'axios';

import MyRequest from '@/global/request';
import { BASE_URL, TIME_OUT } from '@/global/request/config';
import type { IResData } from '@/service/types';
import { LocalCache } from '@/utils';

import type { DeleteDraftResult, DraftRecord, SaveDraftPayload } from './draft.types';

const draftRequest = new MyRequest({
  baseURL: BASE_URL,
  timeout: TIME_OUT,
  interceptors: {
    reqSuccess: (config: AxiosRequestConfig) => {
      const token = LocalCache.getCache('token') ?? '';
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    resSuccess: (res: AxiosResponse) => {
      return res;
    },
    resFail: (error: unknown) => Promise.reject(error),
  },
});

export const getDraftRequest = () =>
  draftRequest.get<IResData<DraftRecord | null>>({
    url: '/draft',
    showLoading: false,
  });

export const getDraftByArticleIdRequest = (articleId: number) =>
  draftRequest.get<IResData<DraftRecord | null>>({
    url: `/draft/${articleId}`,
    showLoading: false,
  });

export const saveDraftRequest = (payload: SaveDraftPayload) =>
  draftRequest.put<IResData<DraftRecord>>({
    url: '/draft',
    data: payload,
    showLoading: false,
  });

export const deleteDraftRequest = (draftId: number) =>
  draftRequest.delete<IResData<DeleteDraftResult>>({
    url: `/draft/${draftId}`,
    showLoading: false,
  });
