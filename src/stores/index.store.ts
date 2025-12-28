import { defineStore } from 'pinia';
import { checkAuth } from '@/service/user/user.request';
import { LocalCache } from '@/utils';
import useUserStore from '@/stores/user.store';
const useRootStore = defineStore('root', {
  state: () => ({
    showLoginDialog: false as boolean, //多个组件都有可能使用该参数,所以放到store中
    pageNum: 1 as number,
    pageSize: 10 as number,
    pageOrder: 'date',
    tagId: '' as number | '',
    windowInfo: {
      width: 0,
      height: 0,
    } as { width: number; height: number },
  }),
  getters: {
    // 当 width 为 0（未初始化）时，默认按大屏处理
    isSmallScreen: (state) => {
      const width = state.windowInfo.width;
      return width !== 0 && width < 1200;
    },
  },
  actions: {
    toggleLoginDialog() {
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
    getWindowInfo() {
      // 立即获取当前窗口尺寸
      this.windowInfo = { width: window.innerWidth, height: window.innerHeight };
      // 然后监听窗口变化
      window.addEventListener('resize', () => {
        const windowInfo = { width: window.innerWidth, height: window.innerHeight };
        this.windowInfo = windowInfo;
      });
    },
    // 异步请求action---------------------------------------------------
    /**
     * 验证token有效性
     * @returns 验证是否通过
     */
    async checkAuthAction(): Promise<boolean> {
      try {
        const res = await checkAuth();
        console.log('checkAuthAction res-----------------', res);
        if (res?.code !== 0) {
          // 针对 Token 过期 ,Axios 的响应拦截器（src/service/index.ts 中的 resFail）会在 这里checkAuth 返回结果之前执行
          // useUserStore().logOut();
          return false;
        }
        return true;
      } catch (error) {
        console.error('Token验证请求失败:', error);
        // 网络错误时不强制登出,返回true允许继续使用
        return true;
      }
    },
    async loadLoginAction() {
      const userStore = useUserStore();
      const token = LocalCache.getCache('token');
      token && (userStore.token = token);
      const userInfo = LocalCache.getCache('userInfo');
      userInfo && (userStore.userInfo = userInfo);
    },
  },
});

export default useRootStore;
