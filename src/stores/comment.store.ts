import { acceptHMRUpdate, defineStore } from 'pinia';

const useCommentStore = defineStore('comment', {
  state: () => ({
    activeReplyId: null as number | null,
    activeEditId: null as number | null,
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
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCommentStore, import.meta.hot));
}

export default useCommentStore;
