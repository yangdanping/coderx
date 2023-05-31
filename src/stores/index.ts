import { defineStore } from 'pinia';
import { checkAuth } from '@/service/user/user.request';
import { LocalCache } from '@/utils';
import useUserStore from '@/stores/user';
const useRootStore = defineStore('root', {
  state: () => ({
    showLoginDialog: false as boolean, //多个组件都有可能使用该参数,所以放到store中
    pageNum: 1 as number,
    pageSize: 5 as number,
    pageOrder: 'date',
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
    changePageOrder(pageOrder: string) {
      this.pageOrder = pageOrder;
    },
    changeTag(tagId) {
      this.tagId = tagId;
    },
    // 异步请求action---------------------------------------------------
    async checkAuthAction() {
      const res = await checkAuth();
      const { logOut } = useUserStore();
      console.log('checkAuthAction res', res.code === 0 ? '验证通过' : '验证失败');
      res.code && logOut(false);
    },
    async loadLoginAction() {
      const { updateToken, updateUserInfo } = useUserStore();
      const token = LocalCache.getCache('token');
      token && updateToken(token);
      const userInfo = LocalCache.getCache('userInfo');
      userInfo && updateUserInfo(userInfo);
    }
  }
});

export default useRootStore;
