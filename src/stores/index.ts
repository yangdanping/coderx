import { defineStore } from 'pinia';
import { checkAuth } from '@/service/user/user.request.js';
import { LocalCache } from '@/utils';
import useUserStore from '@/stores/user';
const useRootStore = defineStore('root', {
  state: () => ({
    userStore: useUserStore(),
    showDialog: false,
    pageNum: 1,
    pageSize: 5,
    tagId: ''
  }),
  actions: {
    changeLoginDialog() {
      this.showDialog = !this.showDialog;
    },
    changePageNum(pageNum: number) {
      this.pageNum = pageNum;
    },
    changePageSize(pageSize: number) {
      this.pageSize = pageSize;
    },
    changeTag(tagId) {
      this.tagId = tagId;
    },
    initPage() {
      this.pageNum = 1;
      this.pageSize = 5;
      this.tagId = '';
    },
    // 异步请求action---------------------------------------------------
    async checkAuthAction() {
      const res = await checkAuth();
      console.log('checkAuthAction res', res);
      res.code && this.userStore.logOut(false);
    },
    async loadLoginAction() {
      const token = LocalCache.getCache('token');
      token && this.userStore.changeToken(token);
      const userInfo = LocalCache.getCache('userInfo');
      userInfo && this.userStore.changeUserInfo(userInfo);
    }
  }
});

export default useRootStore;
