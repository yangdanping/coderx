import { watch } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { validateFlowImageFiles } from '@/components/tiptap-editor-flow/uploadPolicy';
import { useFlowImageUploads } from '@/composables/useFlowImageUploads';
import type { FlowImageAsset } from '@/service/flow/flow.types';

const MB = 1024 * 1024;

function file(name: string, size = 1, type = 'image/png'): File {
  return { name, size, type } as File;
}

function imageAsset(id: number): FlowImageAsset {
  return {
    id,
    url: `https://media.example/${id}.webp`,
    thumbnailUrl: `https://media.example/${id}-small.webp`,
    mimeType: 'image/webp',
    sizeBytes: 100,
    width: 1200,
    height: 800,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function queueAdapters(overrides: Partial<Parameters<typeof useFlowImageUploads>[0]> = {}) {
  let nextId = 0;
  return {
    createClientId: () => `client-${++nextId}`,
    createObjectUrl: (_file: File) => `blob:preview-${nextId}`,
    revokeObjectUrl: vi.fn(),
    deleteImage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('Flow image upload policy', () => {
  it('accepts only the first nine valid files and preserves input order', () => {
    const files = Array.from({ length: 10 }, (_, index) => file(`${index + 1}.png`));
    const result = validateFlowImageFiles(files, 0);

    expect(result.accepted).toEqual(files.slice(0, 9));
    expect(result.rejected).toEqual([expect.objectContaining({ file: files[9], reason: 'count-limit' })]);
  });

  it('uses retained count to calculate exact remaining capacity', () => {
    const files = [file('one.png'), file('two.png'), file('three.png')];
    const result = validateFlowImageFiles(files, 8);

    expect(result.accepted).toEqual([files[0]]);
    expect(result.rejected.map((item) => item.reason)).toEqual(['count-limit', 'count-limit']);
  });

  it('accepts JPEG, PNG, and WebP while returning explicit type rejections in order', () => {
    const files = [
      file('one.jpg', 1, 'image/jpeg'),
      file('two.gif', 1, 'image/gif'),
      file('three.png', 1, 'image/png'),
      file('four.webp', 1, 'image/webp'),
      file('five.svg', 1, 'image/svg+xml'),
    ];
    const result = validateFlowImageFiles(files, 0);

    expect(result.accepted).toEqual([files[0], files[2], files[3]]);
    expect(result.rejected.map((item) => ({ name: item.file.name, reason: item.reason }))).toEqual([
      { name: 'two.gif', reason: 'unsupported-type' },
      { name: 'five.svg', reason: 'unsupported-type' },
    ]);
    expect(result.rejected.every((item) => item.message.length > 0)).toBe(true);
  });

  it('accepts exactly 10MB and rejects one byte over the per-file limit', () => {
    const exact = file('exact.png', 10 * MB);
    const over = file('over.png', 10 * MB + 1);
    const result = validateFlowImageFiles([exact, over], 0);

    expect(result.accepted).toEqual([exact]);
    expect(result.rejected).toEqual([expect.objectContaining({ file: over, reason: 'file-too-large' })]);
  });

  it('accepts exactly 30MB cumulatively and rejects the first byte beyond the batch cap', () => {
    const files = [file('one.png', 10 * MB), file('two.png', 10 * MB), file('three.png', 10 * MB), file('four.png', 1)];
    const result = validateFlowImageFiles(files, 0);

    expect(result.accepted).toEqual(files.slice(0, 3));
    expect(result.rejected).toEqual([expect.objectContaining({ file: files[3], reason: 'batch-too-large' })]);
  });
});

describe('useFlowImageUploads', () => {
  it('creates previews immediately, runs FIFO with observed concurrency three, and retains selection order', async () => {
    const pending = new Map<string, ReturnType<typeof deferred<FlowImageAsset>>>();
    const started: string[] = [];
    let active = 0;
    let maxObservedConcurrency = 0;
    const adapters = queueAdapters({
      uploadImage: vi.fn((selectedFile: File) => {
        active += 1;
        maxObservedConcurrency = Math.max(maxObservedConcurrency, active);
        started.push(selectedFile.name);
        const task = deferred<FlowImageAsset>();
        pending.set(selectedFile.name, task);
        return task.promise.finally(() => {
          active -= 1;
        });
      }),
    });
    const queue = useFlowImageUploads(adapters);
    const files = Array.from({ length: 5 }, (_, index) => file(`${index + 1}.png`));

    const result = queue.addFiles(files);

    expect(result.accepted).toEqual(files);
    expect(queue.attachments.value.map((item) => item.previewUrl)).toEqual(['blob:preview-1', 'blob:preview-2', 'blob:preview-3', 'blob:preview-4', 'blob:preview-5']);
    expect(started).toEqual(['1.png', '2.png', '3.png']);
    expect(queue.isUploading.value).toBe(true);

    pending.get('2.png')!.resolve(imageAsset(41));
    await vi.waitFor(() => expect(started).toEqual(['1.png', '2.png', '3.png', '4.png']));
    pending.get('1.png')!.resolve(imageAsset(42));
    await vi.waitFor(() => expect(started).toEqual(['1.png', '2.png', '3.png', '4.png', '5.png']));
    pending.get('3.png')!.resolve(imageAsset(43));
    pending.get('4.png')!.resolve(imageAsset(44));
    pending.get('5.png')!.resolve(imageAsset(45));

    await vi.waitFor(() => expect(queue.isUploading.value).toBe(false));
    expect(maxObservedConcurrency).toBe(3);
    expect(queue.uploadedMediaIds.value).toEqual([42, 41, 43, 44, 45]);
    expect(queue.attachments.value.map((item) => item.file.name)).toEqual(files.map((item) => item.name));
  });

  it('keeps partial failures as terminal failed items and exposes derived failure state', async () => {
    const adapters = queueAdapters({
      uploadImage: vi.fn((selectedFile: File) => (selectedFile.name === 'bad.png' ? Promise.reject(new Error('network unavailable')) : Promise.resolve(imageAsset(7)))),
    });
    const queue = useFlowImageUploads(adapters);

    queue.addFiles([file('good.png'), file('bad.png')]);

    await vi.waitFor(() => expect(queue.isUploading.value).toBe(false));
    expect(queue.attachments.value.map((item) => item.status)).toEqual(['uploaded', 'failed']);
    expect(queue.attachments.value[1]?.error).toBe('network unavailable');
    expect(queue.hasFailed.value).toBe(true);
    expect(queue.uploadedMediaIds.value).toEqual([7]);
  });

  it('retries the same attachment and client ID by rejoining the FIFO queue', async () => {
    let attempt = 0;
    const adapters = queueAdapters({
      uploadImage: vi.fn(() => {
        attempt += 1;
        return attempt === 1 ? Promise.reject(new Error('first failure')) : Promise.resolve(imageAsset(8));
      }),
    });
    const queue = useFlowImageUploads(adapters);
    queue.addFiles([file('retry.png')]);
    await vi.waitFor(() => expect(queue.attachments.value[0]?.status).toBe('failed'));
    const clientId = queue.attachments.value[0]!.clientId;

    expect(queue.retry(clientId)).toBe(true);

    await vi.waitFor(() => expect(queue.attachments.value[0]?.status).toBe('uploaded'));
    expect(queue.attachments.value[0]?.clientId).toBe(clientId);
    expect(queue.attachments.value[0]?.progress).toBe(100);
    expect(queue.uploadedMediaIds.value).toEqual([8]);
  });

  it('releases the failed attempt slot when retry is triggered before its finally callback', async () => {
    const retryTask = deferred<FlowImageAsset>();
    const laterTask = new Promise<FlowImageAsset>(() => {});
    const started: string[] = [];
    let retryAttempts = 0;
    const adapters = queueAdapters({
      uploadImage: vi.fn((selectedFile: File) => {
        started.push(selectedFile.name);
        if (selectedFile.name !== 'retry.png') return laterTask;
        retryAttempts += 1;
        return retryAttempts === 1 ? Promise.reject(new Error('retry now')) : retryTask.promise;
      }),
    });
    const queue = useFlowImageUploads(adapters);
    const stop = watch(
      queue.attachments,
      (items) => {
        const failed = items.find((item) => item.status === 'failed');
        if (failed) queue.retry(failed.clientId);
      },
      { flush: 'sync' },
    );

    queue.addFiles([file('retry.png')]);
    await vi.waitFor(() => expect(retryAttempts).toBe(2));
    retryTask.resolve(imageAsset(8));
    await vi.waitFor(() => expect(queue.attachments.value[0]?.status).toBe('uploaded'));
    started.splice(0, started.length);

    queue.addFiles([file('later-1.png'), file('later-2.png'), file('later-3.png')]);

    expect(started).toEqual(['later-1.png', 'later-2.png', 'later-3.png']);
    stop();
  });

  it('removes queued work without uploading it and revokes its preview once', () => {
    const never = new Promise<FlowImageAsset>(() => {});
    const uploadImage = vi.fn(() => never);
    const adapters = queueAdapters({ uploadImage });
    const queue = useFlowImageUploads(adapters);
    queue.addFiles([file('1.png'), file('2.png'), file('3.png'), file('queued.png')]);
    const queued = queue.attachments.value[3]!;

    void queue.remove(queued.clientId);
    void queue.remove(queued.clientId);

    expect(uploadImage).toHaveBeenCalledTimes(3);
    expect(queue.attachments.value.map((item) => item.file.name)).not.toContain('queued.png');
    expect(adapters.revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(adapters.revokeObjectUrl).toHaveBeenCalledWith(queued.previewUrl);
  });

  it('aborts an active removal, never converts it to failed, and then advances FIFO', async () => {
    const started: string[] = [];
    const signals = new Map<string, AbortSignal>();
    const adapters = queueAdapters({
      uploadImage: vi.fn((selectedFile: File, _onProgress: (progress: number) => void, signal: AbortSignal) => {
        started.push(selectedFile.name);
        signals.set(selectedFile.name, signal);
        return new Promise<FlowImageAsset>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      }),
    });
    const queue = useFlowImageUploads(adapters);
    queue.addFiles([file('1.png'), file('2.png'), file('3.png'), file('4.png')]);
    const activeItem = queue.attachments.value[0]!;

    await queue.remove(activeItem.clientId);

    expect(signals.get('1.png')?.aborted).toBe(true);
    expect(queue.attachments.value.find((item) => item.clientId === activeItem.clientId)).toBeUndefined();
    await vi.waitFor(() => expect(started).toEqual(['1.png', '2.png', '3.png', '4.png']));
    expect(queue.hasFailed.value).toBe(false);
  });

  it('keeps uploaded media until pending deletion succeeds', async () => {
    const deletion = deferred<void>();
    const deleteImage = vi.fn(() => deletion.promise);
    const adapters = queueAdapters({
      deleteImage,
      uploadImage: vi.fn().mockResolvedValue(imageAsset(42)),
    });
    const queue = useFlowImageUploads(adapters);
    queue.addFiles([file('uploaded.png')]);
    await vi.waitFor(() => expect(queue.attachments.value[0]?.status).toBe('uploaded'));
    const uploaded = queue.attachments.value[0]!;

    const removal = queue.remove(uploaded.clientId);
    expect(deleteImage).toHaveBeenCalledWith(42);
    expect(queue.attachments.value).toHaveLength(1);

    deletion.resolve();
    await removal;
    expect(queue.attachments.value).toHaveLength(0);
    expect(adapters.revokeObjectUrl).toHaveBeenCalledWith(uploaded.previewUrl);
  });

  it('retains uploaded media with an actionable error when pending deletion fails', async () => {
    const adapters = queueAdapters({
      deleteImage: vi.fn().mockRejectedValue(new Error('delete failed')),
      uploadImage: vi.fn().mockResolvedValue(imageAsset(42)),
    });
    const queue = useFlowImageUploads(adapters);
    queue.addFiles([file('uploaded.png')]);
    await vi.waitFor(() => expect(queue.attachments.value[0]?.status).toBe('uploaded'));
    const uploaded = queue.attachments.value[0]!;

    await queue.remove(uploaded.clientId);

    expect(queue.attachments.value).toHaveLength(1);
    expect(queue.attachments.value[0]?.status).toBe('uploaded');
    expect(queue.attachments.value[0]?.error).toBe('delete failed');
    expect(adapters.revokeObjectUrl).not.toHaveBeenCalled();
  });

  it('removes failed items locally and does not call the delete endpoint', async () => {
    const adapters = queueAdapters({ uploadImage: vi.fn().mockRejectedValue(new Error('failed')) });
    const queue = useFlowImageUploads(adapters);
    queue.addFiles([file('failed.png')]);
    await vi.waitFor(() => expect(queue.attachments.value[0]?.status).toBe('failed'));
    const failed = queue.attachments.value[0]!;

    await queue.remove(failed.clientId);

    expect(queue.attachments.value).toHaveLength(0);
    expect(adapters.deleteImage).not.toHaveBeenCalled();
    expect(adapters.revokeObjectUrl).toHaveBeenCalledWith(failed.previewUrl);
  });

  it('moves items with stable bounds-safe ordering', () => {
    const adapters = queueAdapters({ uploadImage: vi.fn(() => new Promise<FlowImageAsset>(() => {})) });
    const queue = useFlowImageUploads(adapters);
    queue.addFiles([file('a.png'), file('b.png'), file('c.png')]);

    expect(queue.move(0, 2)).toBe(true);
    expect(queue.attachments.value.map((item) => item.file.name)).toEqual(['b.png', 'c.png', 'a.png']);
    expect(queue.move(-1, 2)).toBe(false);
    expect(queue.move(0, 3)).toBe(false);
    expect(queue.move(1, 1)).toBe(false);
    expect(queue.attachments.value.map((item) => item.file.name)).toEqual(['b.png', 'c.png', 'a.png']);
  });

  it('dispose aborts active work, revokes every preview once, ignores late callbacks, and never deletes uploaded assets', async () => {
    const task = deferred<FlowImageAsset>();
    let progress: ((value: number) => void) | undefined;
    let signal: AbortSignal | undefined;
    const deleteImage = vi.fn();
    const adapters = queueAdapters({
      deleteImage,
      uploadImage: vi.fn((_file: File, onProgress: (value: number) => void, uploadSignal: AbortSignal) => {
        progress = onProgress;
        signal = uploadSignal;
        return task.promise;
      }),
    });
    const queue = useFlowImageUploads(adapters);
    queue.addFiles([file('late.png')]);
    const previewUrl = queue.attachments.value[0]!.previewUrl;

    queue.dispose();
    queue.dispose();
    progress?.(90);
    task.resolve(imageAsset(99));
    await task.promise;
    await Promise.resolve();

    expect(signal?.aborted).toBe(true);
    expect(queue.attachments.value).toEqual([]);
    expect(queue.uploadedMediaIds.value).toEqual([]);
    expect(adapters.revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(adapters.revokeObjectUrl).toHaveBeenCalledWith(previewUrl);
    expect(deleteImage).not.toHaveBeenCalled();
  });

  it('does not delete already-uploaded assets during dispose', async () => {
    const deleteImage = vi.fn();
    const adapters = queueAdapters({
      deleteImage,
      uploadImage: vi.fn().mockResolvedValue(imageAsset(42)),
    });
    const queue = useFlowImageUploads(adapters);
    queue.addFiles([file('uploaded.png')]);
    await vi.waitFor(() => expect(queue.attachments.value[0]?.status).toBe('uploaded'));

    queue.dispose();

    expect(deleteImage).not.toHaveBeenCalled();
    expect(queue.attachments.value).toEqual([]);
    expect(adapters.revokeObjectUrl).toHaveBeenCalledTimes(1);
  });

  it('creates isolated queue instances without module-global attachment state', async () => {
    const first = useFlowImageUploads(queueAdapters({ uploadImage: vi.fn().mockResolvedValue(imageAsset(1)) }));
    const second = useFlowImageUploads(queueAdapters({ uploadImage: vi.fn().mockResolvedValue(imageAsset(2)) }));

    first.addFiles([file('first.png')]);
    second.addFiles([file('second.png')]);
    await vi.waitFor(() => expect(first.uploadedMediaIds.value).toEqual([1]));
    await vi.waitFor(() => expect(second.uploadedMediaIds.value).toEqual([2]));

    first.dispose();
    expect(first.attachments.value).toEqual([]);
    expect(second.attachments.value).toHaveLength(1);
    expect(second.attachments.value[0]?.file.name).toBe('second.png');
  });
});
