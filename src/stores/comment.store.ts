import { acceptHMRUpdate, defineStore } from 'pinia';

export interface IReplyTraceTarget {
  commentId: number;
  sourceReplyId: number;
  targetReplyId: number;
}

const useCommentStore = defineStore('comment', {
  state: () => ({
    activeReplyId: null as number | null,
    activeEditId: null as number | null,
    activeTrace: null as IReplyTraceTarget | null,
  }),
  actions: {
    setActiveReply(commentId: number | null) {
      if (this.activeReplyId === commentId) {
        this.activeReplyId = null;
      } else {
        this.activeReplyId = commentId;
        this.activeEditId = null;
      }
    },
    setActiveEdit(commentId: number | null) {
      if (this.activeEditId === commentId) {
        this.activeEditId = null;
      } else {
        this.activeEditId = commentId;
        this.activeReplyId = null;
      }
    },
    closeAllForms() {
      this.activeReplyId = null;
      this.activeEditId = null;
      this.activeTrace = null;
    },
    setActiveTrace(trace: IReplyTraceTarget) {
      this.activeTrace = trace;
    },
    clearActiveTrace() {
      this.activeTrace = null;
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCommentStore, import.meta.hot));
}

export default useCommentStore;
