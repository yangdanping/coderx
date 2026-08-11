import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteMock, getMock, putMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  getMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock('@/service', () => ({
  default: {
    delete: deleteMock,
    get: getMock,
    put: putMock,
  },
}));

import { deleteFlowDraftRequest, getFlowDraftRequest, saveFlowDraftRequest } from '../flow-draft.request';

describe('flow-draft.request', () => {
  beforeEach(() => {
    deleteMock.mockReset();
    getMock.mockReset();
    putMock.mockReset();
  });

  it('loads the authenticated user Flow draft without a global loading overlay', () => {
    getFlowDraftRequest();

    expect(getMock).toHaveBeenCalledWith({
      url: '/flow/draft',
      showLoading: false,
      showError: false,
    });
  });

  it('saves only the Flow content, media metadata, and optimistic version', () => {
    saveFlowDraftRequest({
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      meta: { imageIds: [], videoIds: [] },
      version: 3,
    });

    expect(putMock).toHaveBeenCalledWith({
      url: '/flow/draft',
      data: {
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        meta: { imageIds: [], videoIds: [] },
        version: 3,
      },
      showLoading: false,
      showError: false,
    });
  });

  it('discards the current Flow draft by its server id', () => {
    deleteFlowDraftRequest(9);

    expect(deleteMock).toHaveBeenCalledWith({
      url: '/flow/draft/9',
      showLoading: false,
      showError: false,
    });
  });
});
