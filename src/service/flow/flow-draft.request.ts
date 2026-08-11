import myRequest from '@/service';

import type { IResData } from '@/service/types';
import type { DeleteFlowDraftResult, FlowDraftRecord, SaveFlowDraftPayload } from './flow-draft.types';

const flowDraftUrl = '/flow/draft';

export const getFlowDraftRequest = () =>
  myRequest.get<IResData<FlowDraftRecord | null>>({
    url: flowDraftUrl,
    showLoading: false,
    showError: false,
  });

export const saveFlowDraftRequest = (payload: SaveFlowDraftPayload) =>
  myRequest.put<IResData<FlowDraftRecord>>({
    url: flowDraftUrl,
    data: payload,
    showLoading: false,
    showError: false,
  });

export const deleteFlowDraftRequest = (draftId: number) =>
  myRequest.delete<IResData<DeleteFlowDraftResult>>({
    url: `${flowDraftUrl}/${draftId}`,
    showLoading: false,
    showError: false,
  });
