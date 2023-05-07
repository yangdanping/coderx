import { defineStore } from 'pinia';
import { checkAuth } from '@/service/user/user.request';
import { LocalCache } from '@/utils';
import useUserStore from '@/stores/user';
const useRootStore = defineStore('root', {
  state: () => ({
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
      const { logOut } = useUserStore();
      console.log('checkAuthAction res', res);
      res.code && logOut(false);
    },
    async loadLoginAction() {
      const { changeToken, changeUserInfo } = useUserStore();
      const token = LocalCache.getCache('token');
      token && changeToken(token);
      const userInfo = LocalCache.getCache('userInfo');
      userInfo && changeUserInfo(userInfo);
    }
  }
});

export default useRootStore;
