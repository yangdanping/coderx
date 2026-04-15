import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  uploadImgMock,
  addPendingImageIdMock,
  showInfoMock,
  showSuccessMock,
  showFailMock,
} = vi.hoisted(() => ({
  uploadImgMock: vi.fn(),
  addPendingImageIdMock: vi.fn(),
  showInfoMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showFailMock: vi.fn(),
}));

vi.mock('@/service/file/file.request', () => ({
  uploadImg: uploadImgMock,
}));

vi.mock('@/stores/editor.store', () => ({
  default: () => ({
    addPendingImageId: addPendingImageIdMock,
  }),
}));

vi.mock('@/utils', () => ({
  Msg: {
    showInfo: showInfoMock,
    showSuccess: showSuccessMock,
    showFail: showFailMock,
  },
}));

import { ImageUpload } from '../ImageUpload';

const createFileWithSize = (name: string, type: string, size: number) => {
  const file = new File(['mock'], name, { type });
  Object.defineProperty(file, 'size', {
    configurable: true,
    value: size,
  });
  return file;
};

const createUploadImageCommand = (
  file: File,
  options?: {
    insertSelection?: {
      from: number;
      to: number;
    } | null;
    onUploaded?: ((payload: { url: string; imgId: number }) => void) | null;
  },
) => {
  const addCommands = ImageUpload.config.addCommands as unknown as () => {
    uploadImage: (
      incomingFile: File,
      incomingOptions?: {
        insertSelection?: {
          from: number;
          to: number;
        } | null;
        onUploaded?: ((payload: { url: string; imgId: number }) => void) | null;
      },
    ) => (props: unknown) => boolean;
  };

  return addCommands().uploadImage(file, options);
};

describe('ImageUpload', () => {
  beforeEach(() => {
    uploadImgMock.mockReset();
    addPendingImageIdMock.mockReset();
    showInfoMock.mockReset();
    showSuccessMock.mockReset();
    showFailMock.mockReset();
  });

  it('appends uploaded image at the document end when the editor is not focused', async () => {
    uploadImgMock.mockResolvedValue({
      code: 0,
      data: [
        {
          url: 'http://example.com/demo.jpg',
          result: {
            insertId: 88,
          },
        },
      ],
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
      chain: vi.fn(() => chain),
      commands: {
        focus: vi.fn(),
      },
    };

    const uploadCommand = createUploadImageCommand(
      new File(['demo'], 'demo.jpg', { type: 'image/jpeg' }),
    );

    const result = uploadCommand?.({ editor } as never);

    expect(result).toBe(true);

    await flushPromises();

    expect(chain.focus).toHaveBeenCalledWith('end');
    expect(chain.insertContent).toHaveBeenCalledWith({
      type: 'image',
      attrs: {
        imageId: 88,
        src: 'http://example.com/demo.jpg',
        alt: '',
      },
    });
    expect(chain.run).toHaveBeenCalledTimes(1);
    expect(addPendingImageIdMock).toHaveBeenCalledWith(88);
  });

  it('inserts uploaded image at the current cursor when the editor is focused', async () => {
    uploadImgMock.mockResolvedValue({
      code: 0,
      data: [
        {
          url: 'http://example.com/focused.jpg',
          result: {
            insertId: 99,
          },
        },
      ],
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
      chain: vi.fn(() => chain),
      commands: {
        focus: vi.fn(),
      },
    };

    const uploadCommand = createUploadImageCommand(
      new File(['focused'], 'focused.jpg', { type: 'image/jpeg' }),
      {
        insertSelection: {
          from: 7,
          to: 7,
        },
      },
    );

    const result = uploadCommand?.({ editor } as never);

    expect(result).toBe(true);

    await flushPromises();

    expect(chain.focus.mock.calls[0]).toEqual([]);
    expect(chain.setTextSelection).toHaveBeenCalledWith({
      from: 7,
      to: 7,
    });
    expect(chain.insertContent).toHaveBeenCalledWith({
      type: 'image',
      attrs: {
        imageId: 99,
        src: 'http://example.com/focused.jpg',
        alt: '',
      },
    });
    expect(chain.run).toHaveBeenCalledTimes(1);
    expect(addPendingImageIdMock).toHaveBeenCalledWith(99);
  });

  it('delegates insertion to a custom upload callback when split markdown mode manages the target position', async () => {
    uploadImgMock.mockResolvedValue({
      code: 0,
      data: [
        {
          url: 'http://example.com/split-mode.jpg',
          result: {
            insertId: 123,
          },
        },
      ],
    });

    const onUploadedMock = vi.fn();
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
      chain: vi.fn(() => chain),
      commands: {
        focus: vi.fn(),
      },
    };

    const uploadCommand = createUploadImageCommand(
      new File(['split'], 'split-mode.jpg', { type: 'image/jpeg' }),
      {
        onUploaded: onUploadedMock,
      },
    );

    const result = uploadCommand?.({ editor } as never);

    expect(result).toBe(true);

    await flushPromises();

    expect(onUploadedMock).toHaveBeenCalledWith({
      url: 'http://example.com/split-mode.jpg',
      imgId: 123,
    });
    expect(chain.insertContent).not.toHaveBeenCalled();
    expect(addPendingImageIdMock).toHaveBeenCalledWith(123);
  });

  it('rejects non-image files before starting upload', () => {
    const uploadCommand = createUploadImageCommand(
      createFileWithSize('notes.txt', 'text/plain', 1024),
    );

    const result = uploadCommand?.({ editor: {} } as never);

    expect(result).toBe(false);
    expect(uploadImgMock).not.toHaveBeenCalled();
    expect(showInfoMock).toHaveBeenCalledWith('只能上传图片文件');
  });

  it('rejects images larger than 20MB before starting upload', () => {
    const uploadCommand = createUploadImageCommand(
      createFileWithSize('huge.jpg', 'image/jpeg', 20 * 1024 * 1024 + 1),
    );

    const result = uploadCommand?.({ editor: {} } as never);

    expect(result).toBe(false);
    expect(uploadImgMock).not.toHaveBeenCalled();
    expect(showInfoMock).toHaveBeenCalledWith('图片大小不能超过 20MB');
  });
});
