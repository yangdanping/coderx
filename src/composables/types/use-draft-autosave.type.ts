import type { DraftRecord, SaveDraftPayload, TiptapDocContent } from '@/service/draft/draft.types';

export type DraftAutosaveStatus = 'idle' | 'hydrating' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export interface DraftSnapshotInput {
  articleId: number | null;
  title: string | null;
  content: TiptapDocContent;
  meta: SaveDraftPayload['meta'];
}

type SchedulerErrorAction = 'continue' | 'halt';

export interface DraftSaveSchedulerOptions<TSnapshot, TResult> {
  debounceMs?: number;
  save: (snapshot: TSnapshot) => Promise<TResult>;
  onDirty?: (snapshot: TSnapshot) => void;
  onSaving?: (snapshot: TSnapshot) => void;
  onSaved?: (result: TResult, snapshot: TSnapshot) => void;
  onError?: (error: unknown, snapshot: TSnapshot) => SchedulerErrorAction | void;
}

export interface UseDraftAutosaveOptions {
  scopeId: string;
  articleId?: number | null;
  debounceMs?: number;
}
