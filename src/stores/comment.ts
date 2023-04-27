import { defineStore } from 'pinia';

export const useCommentStore = defineStore('comment', {
  state: () => ({
    commentInfo: [],
    replyInfo: [],
    commentLikedId: []
  }),
  getters: {},
  actions: {
    initComment() {
      this.commentInfo = [];
      this.replyInfo = [];
    }
  }
});

export default useCommentStore;
