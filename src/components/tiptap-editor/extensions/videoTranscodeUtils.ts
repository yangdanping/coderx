/**
 * 视频转码状态复核工具集
 *
 * 统一处理两条链路共用的轮询 / 节点更新逻辑：
 * 1. 上传后静默轮询（VideoUpload 扩展）
 * 2. 草稿加载后的节点复核（Edit.vue）
 */
import { getVideoStatus } from '@/service/file/file.request';

import type {
  EditorJsonNode,
  PollTranscodeStatusOptions,
  PollTranscodeStatusResult,
  RevalidateVideoNodesHooks,
} from './types';

export type {
  PollTranscodeOutcome,
  PollTranscodeStatusOptions,
  PollTranscodeStatusResult,
  RevalidateVideoNodesHooks,
} from './types';

const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 60_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 静默轮询指定视频的 transcode_status，直到落到终态或超时。
 *
 * - 成功：返回 `completed` / `failed`
 * - HTTP/网络错误或 code !== 0：视为 `missing`（通常意味着 file 记录已被清理）
 * - 达到 timeoutMs 仍为 processing/pending：返回 `timeout`
 */
export const pollTranscodeStatus = async (
  videoId: number,
  options: PollTranscodeStatusOptions = {},
): Promise<PollTranscodeStatusResult> => {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  let lastPoster: string | null | undefined;

  while (true) {
    if (options.shouldAbort?.()) {
      return { outcome: 'timeout', poster: lastPoster ?? null };
    }

    try {
      const res = await getVideoStatus(videoId);
      if (res?.code === 0 && res.data) {
        lastPoster = res.data.poster ?? null;
        const status = res.data.transcode_status;
        if (status === 'completed' || status === 'failed') {
          return { outcome: status, poster: lastPoster };
        }
      } else {
        return { outcome: 'missing', poster: lastPoster ?? null };
      }
    } catch (error) {
      console.warn(`[videoTranscodeUtils] 轮询 videoId=${videoId} 失败:`, error);
      return { outcome: 'missing', poster: lastPoster ?? null };
    }

    if (Date.now() >= deadline) {
      return { outcome: 'timeout', poster: lastPoster ?? null };
    }

    await sleep(intervalMs);
  }
};

/**
 * 单次查询，不轮询。用于草稿加载复核——批量一次性扫描，拿终态就处理掉；
 * 命中 processing 的再走 pollTranscodeStatus。
 */
export const fetchVideoStatusOnce = async (videoId: number): Promise<PollTranscodeStatusResult> => {
  try {
    const res = await getVideoStatus(videoId);
    if (res?.code === 0 && res.data) {
      const status = res.data.transcode_status;
      const poster = res.data.poster ?? null;
      if (status === 'completed' || status === 'failed' || status === 'processing' || status === 'pending') {
        return { outcome: status, poster };
      }
      return { outcome: 'missing', poster };
    }
    return { outcome: 'missing' };
  } catch (error) {
    console.warn(`[videoTranscodeUtils] 查询 videoId=${videoId} 失败:`, error);
    return { outcome: 'missing' };
  }
};

const normalizeVideoId = (videoId: unknown): number | null => {
  const normalizedId = Number(videoId);
  return Number.isInteger(normalizedId) && normalizedId > 0 ? normalizedId : null;
};

/**
 * 遍历 editor doc 找到 `videoId === targetId` 的首个节点位置。
 *
 * tiptap/ProseMirror 的 atomic 节点可以有多个实例（极少场景），本工具按首个命中处理——
 * 当前产品 MAX_VIDEO_COUNT=2 且每个 id 唯一，按首个处理足够。
 */
const findVideoNodePos = (
  editor: any,
  targetId: number,
): { pos: number; node: any } | null => {
  const doc = editor?.state?.doc;
  if (!doc) return null;

  let found: { pos: number; node: any } | null = null;
  doc.descendants((node: any, pos: number) => {
    if (found) return false;
    if (node?.type?.name === 'video') {
      const id = normalizeVideoId(node.attrs?.videoId);
      if (id === targetId) {
        found = { pos, node };
        return false;
      }
    }
    return true;
  });

  return found;
};

/**
 * 把节点的 poster 属性刷新成最新值；不强制 focus，不触发选区变化。
 */
export const refreshVideoNodePoster = (editor: any, videoId: number, poster: string | null): boolean => {
  const normalizedId = normalizeVideoId(videoId);
  if (!editor || !normalizedId) return false;

  const target = findVideoNodePos(editor, normalizedId);
  if (!target) return false;

  try {
    const nextAttrs = { ...target.node.attrs, poster };
    editor
      .chain()
      .command(({ tr }: any) => {
        tr.setNodeMarkup(target.pos, undefined, nextAttrs);
        return true;
      })
      .run();
    return true;
  } catch (error) {
    console.warn(`[videoTranscodeUtils] 刷新 videoId=${videoId} 的 poster 失败:`, error);
    return false;
  }
};

/**
 * 按 videoId 删除编辑器里的 video 节点。
 */
export const removeVideoNodeById = (editor: any, videoId: number): boolean => {
  const normalizedId = normalizeVideoId(videoId);
  if (!editor || !normalizedId) return false;

  const target = findVideoNodePos(editor, normalizedId);
  if (!target) return false;

  try {
    editor
      .chain()
      .command(({ tr }: any) => {
        tr.delete(target.pos, target.pos + target.node.nodeSize);
        return true;
      })
      .run();
    return true;
  } catch (error) {
    console.warn(`[videoTranscodeUtils] 删除 videoId=${videoId} 节点失败:`, error);
    return false;
  }
};

/**
 * 从 tiptap JSON 扫出所有合法 videoId（去重）。
 * 用于草稿加载复核时批量发起 `GET /video/:id`。
 */
export const collectVideoIdsFromJson = (node?: EditorJsonNode): number[] => {
  const ids = new Set<number>();

  const walk = (currentNode?: EditorJsonNode) => {
    if (!currentNode) return;
    if (currentNode.type === 'video') {
      const videoId = normalizeVideoId(currentNode.attrs?.videoId);
      if (videoId) ids.add(videoId);
    }
    if (currentNode.content?.length) {
      for (const child of currentNode.content) walk(child);
    }
  };

  walk(node);
  return Array.from(ids);
};

/**
 * 草稿 / 文章加载完成后对编辑器里的 video 节点做一次状态复核。
 *
 * 规则：
 * - completed：用最新 poster 刷节点 attr
 * - failed    ：弹告警 + 删节点 + 触发 onNodeRemoved
 * - processing：启动轮询，拿到终态后再按 completed/failed 分支处理
 * - pending   ：同 processing（后端尚未推进，可能是上一次 session 遗留）
 * - missing   ：file 已被孤儿清理 → 删节点 + 提示失效
 *
 * 此方法是 fire-and-forget；调用方不需要等待它完成，也不应阻塞 UI。
 */
export const revalidateVideoNodesOnLoad = async (
  editor: any,
  hooks: RevalidateVideoNodesHooks = {},
): Promise<void> => {
  if (!editor) return;

  const jsonContent = editor.getJSON?.() as EditorJsonNode | undefined;
  const videoIds = collectVideoIdsFromJson(jsonContent);
  if (!videoIds.length) return;

  const handleFailedOrMissing = (videoId: number, reason: 'failed' | 'missing') => {
    removeVideoNodeById(editor, videoId);
    hooks.onNodeRemoved?.(videoId, reason);
    hooks.onNodeReconciled?.(videoId, reason);
  };

  await Promise.all(
    videoIds.map(async (videoId) => {
      if (hooks.shouldAbort?.()) return;

      const firstResult = await fetchVideoStatusOnce(videoId);
      const initialOutcome = firstResult.outcome;

      if (initialOutcome === 'completed') {
        if (firstResult.poster !== undefined) {
          refreshVideoNodePoster(editor, videoId, firstResult.poster ?? null);
        }
        hooks.onNodeReconciled?.(videoId, 'completed');
        return;
      }

      if (initialOutcome === 'failed') {
        handleFailedOrMissing(videoId, 'failed');
        return;
      }

      if (initialOutcome === 'missing') {
        handleFailedOrMissing(videoId, 'missing');
        return;
      }

      // initialOutcome 一定是 processing / pending / timeout，此时启动轮询
      const pollResult = await pollTranscodeStatus(videoId, {
        intervalMs: 2500,
        timeoutMs: 60_000,
        shouldAbort: hooks.shouldAbort,
      });

      if (pollResult.outcome === 'completed') {
        refreshVideoNodePoster(editor, videoId, pollResult.poster ?? null);
        hooks.onNodeReconciled?.(videoId, 'completed');
      } else if (pollResult.outcome === 'failed') {
        handleFailedOrMissing(videoId, 'failed');
      } else if (pollResult.outcome === 'missing') {
        handleFailedOrMissing(videoId, 'missing');
      } else {
        // 'timeout' / 'pending' / 'processing'：保留节点，让用户继续编辑
        hooks.onNodeReconciled?.(videoId, pollResult.outcome);
      }
    }),
  );
};
