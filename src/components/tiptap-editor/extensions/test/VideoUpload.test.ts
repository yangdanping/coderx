import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  uploadVideoMock,
  addPendingVideoIdMock,
  registerVideoMetaMock,
  showInfoMock,
  showSuccessMock,
  showFailMock,
} = vi.hoisted(() => ({
  uploadVideoMock: vi.fn(),
  addPendingVideoIdMock: vi.fn(),
  registerVideoMetaMock: vi.fn(),
  showInfoMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showFailMock: vi.fn(),
}));

vi.mock('@/service/file/file.request', () => ({
  uploadVideo: uploadVideoMock,
}));

vi.mock('@/stores/editor.store', () => ({
  default: () => ({
    addPendingVideoId: addPendingVideoIdMock,
    registerVideoMeta: registerVideoMetaMock,
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
    addPendingVideoIdMock.mockReset();
    registerVideoMetaMock.mockReset();
    showInfoMock.mockReset();
    showSuccessMock.mockReset();
    showFailMock.mockReset();
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

    const uploadCommand = createUploadVideoCommand(
      new File(['demo'], 'demo.mp4', { type: 'video/mp4' }),
    );

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

    const uploadCommand = createUploadVideoCommand(
      new File(['demo'], 'focused.mp4', { type: 'video/mp4' }),
      {
        insertSelection: {
          from: 11,
          to: 11,
        },
      },
    );

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
