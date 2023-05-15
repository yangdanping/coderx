import { defineStore } from 'pinia';
import { checkAuth } from '@/service/user/user.request';
import { LocalCache } from '@/utils';
import useUserStore from '@/stores/user';
const useRootStore = defineStore('root', {
  state: () => ({
    showLoginDialog: false as boolean, //多个组件都有可能使用该参数,所以放到store中
    pageNum: 1 as number,
    pageSize: 5 as number,
    tagId: '' as number | ''
  }),
  actions: {
    changeLoginDialog() {
      this.showLoginDialog = !this.showLoginDialog;
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
