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
    },
    async commentAction(payload) {
      console.log('commentAction', payload);
    }
  }
});

export default useCommentStore;
