import type { VideoTranscodeStatus } from '../../types/video-upload.type';

/** 轮询或单次查询的 outcome：后端状态 + 前端扩展的终态 */
export type PollTranscodeOutcome = VideoTranscodeStatus | 'timeout' | 'missing';

export interface PollTranscodeStatusOptions {
  /** 轮询间隔，默认 2000ms */
  intervalMs?: number;
  /** 轮询上限，默认 60_000ms（单机 ffmpeg 大视频可能 20-60s） */
  timeoutMs?: number;
  /** 外部提前终止（切换页面等），返回 true 则提前结束轮询，outcome='timeout' */
  shouldAbort?: () => boolean;
}

export interface PollTranscodeStatusResult {
  outcome: PollTranscodeOutcome;
  /** 最后一次成功响应里的 poster（相对路径或完整 URL，由后端决定） */
  poster?: string | null;
}

export interface RevalidateVideoNodesHooks {
  /**
   * 节点被删除（failed / missing）时的回调，
   * 交给调用方同步 editorStore.pendingVideoIds 等外部状态。
   */
  onNodeRemoved?: (videoId: number, reason: 'failed' | 'missing') => void;
  /**
   * 单个节点完成复核的回调（completed / failed / missing / timeout）。
   * 可用于 toast / 日志，属于可选观察点。
   */
  onNodeReconciled?: (videoId: number, outcome: PollTranscodeOutcome) => void;
  /**
   * 轮询 processing 节点时的 shouldAbort 钩子（切换路由等场景）。
   */
  shouldAbort?: () => boolean;
}
