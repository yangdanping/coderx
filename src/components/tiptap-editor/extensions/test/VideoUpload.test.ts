import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  uploadVideoMock,
  getVideoStatusMock,
  addPendingVideoIdMock,
  registerVideoMetaMock,
  removePendingVideoIdMock,
  showInfoMock,
  showSuccessMock,
  showFailMock,
} = vi.hoisted(() => ({
  uploadVideoMock: vi.fn(),
  getVideoStatusMock: vi.fn(),
  addPendingVideoIdMock: vi.fn(),
  registerVideoMetaMock: vi.fn(),
  removePendingVideoIdMock: vi.fn(),
  showInfoMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showFailMock: vi.fn(),
}));

vi.mock('@/service/file/file.request', () => ({
  uploadVideo: uploadVideoMock,
  getVideoStatus: getVideoStatusMock,
}));

vi.mock('@/stores/editor.store', () => ({
  default: () => ({
    addPendingVideoId: addPendingVideoIdMock,
    registerVideoMeta: registerVideoMetaMock,
    removePendingVideoId: removePendingVideoIdMock,
  }),
}));

vi.mock('@/utils', () => ({
  Msg: {
    showInfo: showInfoMock,
    showSuccess: showSuccessMock,
    showFail: showFailMock,
  },
}));

import { VideoUpload } from '../VideoUpload';

const createFileWithSize = (name: string, type: string, size: number) => {
  const file = new File(['mock'], name, { type });
  Object.defineProperty(file, 'size', {
    configurable: true,
    value: size,
  });
  return file;
};

/**
 * 构造一个包含合法 ISO BMFF `ftyp` box 的 mp4 假文件，
 * 让 getVideoMagicNumberMismatchMessage 放行到真实上传逻辑。
 */
const createValidMp4File = (name = 'demo.mp4') => {
  // bytes 0-3: box size(any)；bytes 4-7: 'ftyp'；8-11: major brand 'isom'
  const header = new Uint8Array([
    0x00, 0x00, 0x00, 0x20, // size
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x69, 0x73, 0x6f, 0x6d, // 'isom'
  ]);
  return new File([header], name, { type: 'video/mp4' });
};

const createUploadVideoCommand = (
  file: File,
  options?: {
    insertSelection?: {
      from: number;
      to: number;
    } | null;
  },
) => {
  const addCommands = VideoUpload.config.addCommands as unknown as () => {
    uploadVideo: (
      incomingFile: File,
      incomingOptions?: {
        insertSelection?: {
          from: number;
          to: number;
        } | null;
      },
    ) => (props: unknown) => boolean;
  };

  return addCommands().uploadVideo(file, options);
};

describe('VideoUpload', () => {
  beforeEach(() => {
    uploadVideoMock.mockReset();
    getVideoStatusMock.mockReset();
    addPendingVideoIdMock.mockReset();
    registerVideoMetaMock.mockReset();
    removePendingVideoIdMock.mockReset();
    showInfoMock.mockReset();
    showSuccessMock.mockReset();
    showFailMock.mockReset();

    // 默认让 pollTranscodeStatus 第一次轮询就落入 missing，避免后续 setTimeout 污染测试
    getVideoStatusMock.mockResolvedValue({ code: 1, data: null });
  });

  it('appends uploaded video at the document end when the editor is not focused', async () => {
    uploadVideoMock.mockResolvedValue({
      code: 0,
      data: {
        id: 99,
        url: 'http://example.com/demo.mp4',
        poster: 'http://example.com/demo.jpg',
      },
    });

    const chain = {
      focus: vi.fn(),
      setTextSelection: vi.fn(),
      insertContent: vi.fn(),
      run: vi.fn(),
    };

    chain.focus.mockReturnValue(chain);
    chain.setTextSelection.mockReturnValue(chain);
    chain.insertContent.mockReturnValue(chain);

    const editor = {
      isFocused: false,
      getJSON: vi.fn(() => ({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: '原有标题' }],
          },
        ],
      })),
      chain: vi.fn(() => chain),
    };

    const uploadCommand = createUploadVideoCommand(createValidMp4File('demo.mp4'));

    const result = uploadCommand?.({ editor } as never);

    expect(result).toBe(true);

    await flushPromises();

    expect(chain.focus).toHaveBeenCalledWith('end');
    expect(chain.insertContent).toHaveBeenCalledWith({
      type: 'video',
      attrs: {
        videoId: 99,
        src: 'http://example.com/demo.mp4',
        poster: 'http://example.com/demo.jpg',
        controls: true,
        style: 'width: 360px; max-width: 100%; height: auto;',
      },
    });
    expect(chain.run).toHaveBeenCalledTimes(1);
    expect(addPendingVideoIdMock).toHaveBeenCalledWith(99);
    expect(registerVideoMetaMock).toHaveBeenCalledWith({
      videoId: 99,
      src: 'http://example.com/demo.mp4',
      poster: 'http://example.com/demo.jpg',
      controls: true,
      style: 'width: 360px; max-width: 100%; height: auto;',
    });
  });

  it('inserts uploaded video at the provided selection even after the editor loses focus', async () => {
    uploadVideoMock.mockResolvedValue({
      code: 0,
      data: {
        id: 100,
        url: 'http://example.com/focused.mp4',
        poster: 'http://example.com/focused.jpg',
      },
    });

    const chain = {
      focus: vi.fn(),
      setTextSelection: vi.fn(),
      insertContent: vi.fn(),
      run: vi.fn(),
    };

    chain.focus.mockReturnValue(chain);
    chain.setTextSelection.mockReturnValue(chain);
    chain.insertContent.mockReturnValue(chain);

    const editor = {
      isFocused: false,
      getJSON: vi.fn(() => ({
        type: 'doc',
        content: [],
      })),
      chain: vi.fn(() => chain),
    };

    const uploadCommand = createUploadVideoCommand(createValidMp4File('focused.mp4'), {
      insertSelection: {
        from: 11,
        to: 11,
      },
    });

    const result = uploadCommand?.({ editor } as never);

    expect(result).toBe(true);

    await flushPromises();

    expect(chain.focus.mock.calls[0]).toEqual([]);
    expect(chain.setTextSelection).toHaveBeenCalledWith({
      from: 11,
      to: 11,
    });
    expect(chain.insertContent).toHaveBeenCalledWith({
      type: 'video',
      attrs: {
        videoId: 100,
        src: 'http://example.com/focused.mp4',
        poster: 'http://example.com/focused.jpg',
        controls: true,
        style: 'width: 360px; max-width: 100%; height: auto;',
      },
    });
    expect(chain.run).toHaveBeenCalledTimes(1);
  });

  it('rejects non-video files before starting upload', () => {
    const editor = {
      getJSON: vi.fn(() => ({
        type: 'doc',
        content: [],
      })),
    };

    const uploadCommand = createUploadVideoCommand(
      createFileWithSize('demo.txt', 'text/plain', 1024),
    );

    const result = uploadCommand?.({ editor } as never);

    expect(result).toBe(false);
    expect(uploadVideoMock).not.toHaveBeenCalled();
    expect(showInfoMock).toHaveBeenCalledWith('只能上传视频文件');
  });

  it('rejects mp4 files whose magic number is not ftyp', async () => {
    const editor = {
      isFocused: false,
      getJSON: vi.fn(() => ({
        type: 'doc',
        content: [],
      })),
      chain: vi.fn(),
    };

    // 一个声称是 mp4、但文件头不是 ftyp 的垃圾 File
    const bogusMp4 = new File([new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])], 'bogus.mp4', {
      type: 'video/mp4',
    });

    const uploadCommand = createUploadVideoCommand(bogusMp4);

    const result = uploadCommand?.({ editor } as never);

    // 同步校验是通过的（类型/大小），所以 command 返回 true；magic 校验在 async 里拒绝
    expect(result).toBe(true);

    await flushPromises();

    expect(uploadVideoMock).not.toHaveBeenCalled();
    expect(showFailMock).toHaveBeenCalledWith('文件头校验失败，可能不是有效的视频文件');
  });

  it('rejects videos larger than 20MB before starting upload', () => {
    const editor = {
      getJSON: vi.fn(() => ({
        type: 'doc',
        content: [],
      })),
    };

    const uploadCommand = createUploadVideoCommand(
      createFileWithSize('huge.mp4', 'video/mp4', 20 * 1024 * 1024 + 1),
    );

    const result = uploadCommand?.({ editor } as never);

    expect(result).toBe(false);
    expect(uploadVideoMock).not.toHaveBeenCalled();
    expect(showInfoMock).toHaveBeenCalledWith('视频大小不能超过 20MB');
    expect(showFailMock).not.toHaveBeenCalled();
  });
});
