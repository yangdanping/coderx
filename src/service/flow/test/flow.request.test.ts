import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateFlowPayload, FlowImageAsset, FlowItem } from '../flow.types';

const { deleteMock, getMock, postMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@/service', () => ({
  default: {
    delete: deleteMock,
    get: getMock,
    post: postMock,
  },
}));

import { createFlow, deletePendingFlowImage, getFlowFeed, getFlowItemById, uploadFlowImage } from '../flow.request';

const asset: FlowImageAsset = {
  id: 42,
  url: 'https://media.example/original.webp',
  thumbnailUrl: 'https://media.example/small.webp',
  mimeType: 'image/webp',
  sizeBytes: 1234,
  width: 1200,
  height: 800,
};

const flowItem: FlowItem = {
  id: 9,
  author: {
    id: 7,
    name: '林墨',
    username: 'linmo',
    avatarUrl: 'https://media.example/avatar.webp',
  },
  body: '你好',
  bodyHtml: '<p>你好</p>',
  media: [
    {
      id: 42,
      url: 'https://media.example/original.webp',
      thumbnailUrl: 'https://media.example/small.webp',
      title: '',
    },
  ],
  likes: 0,
  comments: 0,
  liked: false,
  createdAt: '2026-08-11T00:00:00.000Z',
};

describe('flow requests', () => {
  beforeEach(() => {
    deleteMock.mockReset();
    getMock.mockReset();
    postMock.mockReset();
  });

  it('uploads one image under the exact multipart key with progress, abort, and queue-owned errors', async () => {
    postMock.mockResolvedValue({ code: 0, data: asset });
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    const signal = new AbortController().signal;
    const onProgress = vi.fn();

    await expect(uploadFlowImage(file, onProgress, signal)).resolves.toEqual(asset);

    expect(postMock).toHaveBeenCalledOnce();
    const config = postMock.mock.calls[0]?.[0];
    expect(config).toMatchObject({
      url: '/media/images',
      signal,
      showLoading: false,
      showError: false,
    });
    expect(config.data).toBeInstanceOf(FormData);
    expect(config.data.get('image')).toBe(file);
    expect([...config.data.keys()]).toEqual(['image']);
    config.onUploadProgress({ loaded: 5, total: 10 });
    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it('deletes only the requested pending media and validates the success payload', async () => {
    deleteMock.mockResolvedValue({ code: 0, data: { deleted: true } });

    await expect(deletePendingFlowImage(42)).resolves.toBeUndefined();
    expect(deleteMock).toHaveBeenCalledWith({
      url: '/media/images/42',
      showLoading: false,
      showError: false,
    });

    deleteMock.mockResolvedValueOnce({ code: 0, data: { deleted: 'yes' } });
    await expect(deletePendingFlowImage(42)).rejects.toThrow(/malformed/i);
  });

  it('creates a Flow with structured content and ordered media IDs', async () => {
    postMock.mockResolvedValue({ code: 0, data: flowItem });
    const payload: CreateFlowPayload = {
      clientRequestId: '4f95672f-4f8e-4cc1-9953-7ba4c2d5f4cf',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      mediaIds: [42, 41],
    };

    await expect(createFlow(payload)).resolves.toEqual(flowItem);
    expect(postMock).toHaveBeenCalledWith({
      url: '/flow',
      data: payload,
      showLoading: false,
      showError: false,
    });
  });

  it('loads API-backed pages without a global loading overlay', async () => {
    const firstPage = { items: [flowItem], total: 2, page: 1, pageSize: 10 };
    const secondItem = { ...flowItem, id: 10 };
    const secondPage = { items: [secondItem], total: 2, page: 2, pageSize: 10 };
    getMock.mockResolvedValueOnce({ code: 0, data: firstPage }).mockResolvedValueOnce({ code: 0, data: secondPage });

    await expect(getFlowFeed(1, 10)).resolves.toEqual(firstPage);
    await expect(getFlowFeed(2, 10)).resolves.toEqual(secondPage);
    expect(firstPage.items[0]?.body).toMatch(/[\u4e00-\u9fa5]/);
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id);
    expect(getMock).toHaveBeenNthCalledWith(1, {
      url: '/flow',
      params: { pageNum: 1, pageSize: 10 },
      showLoading: false,
    });
    expect(getMock).toHaveBeenNthCalledWith(2, {
      url: '/flow',
      params: { pageNum: 2, pageSize: 10 },
      showLoading: false,
    });
  });

  it('requests numeric detail IDs and maps only HTTP 404 to null', async () => {
    getMock.mockResolvedValueOnce({ code: 0, data: flowItem });
    await expect(getFlowItemById(9)).resolves.toEqual(flowItem);
    expect(getMock).toHaveBeenLastCalledWith({
      url: '/flow/9',
      showLoading: false,
    });

    getMock.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(getFlowItemById(404)).resolves.toBeNull();

    const outage = { response: { status: 503 } };
    getMock.mockRejectedValueOnce(outage);
    await expect(getFlowItemById(9)).rejects.toBe(outage);
  });

  it('rejects unsuccessful or malformed upload, create, feed, and detail envelopes', async () => {
    postMock.mockResolvedValueOnce({ code: 7, data: asset, msg: 'nope' });
    await expect(uploadFlowImage(new File(['x'], 'x.png', { type: 'image/png' }), vi.fn())).rejects.toThrow(/code 0/i);

    postMock.mockResolvedValueOnce({ code: 0, data: { ...flowItem, bodyHtml: 3 } });
    await expect(
      createFlow({
        clientRequestId: '4f95672f-4f8e-4cc1-9953-7ba4c2d5f4cf',
        content: { type: 'doc' },
        mediaIds: [],
      }),
    ).rejects.toThrow(/malformed/i);

    getMock.mockResolvedValueOnce({ code: 0, data: { items: [flowItem], total: 1, page: 1 } });
    await expect(getFlowFeed(1)).rejects.toThrow(/malformed/i);

    getMock.mockResolvedValueOnce({ code: 0, data: { ...flowItem, author: { ...flowItem.author, avatarUrl: 5 } } });
    await expect(getFlowItemById(9)).rejects.toThrow(/malformed/i);
  });

  it('rejects invalid numeric arguments before issuing a request', async () => {
    await expect(getFlowItemById(0)).rejects.toThrow(/positive safe integer/i);
    await expect(deletePendingFlowImage(Number.NaN)).rejects.toThrow(/positive safe integer/i);
    await expect(getFlowFeed(1, 101)).rejects.toThrow(/between 1 and 100/i);
    expect(getMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
