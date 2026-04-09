import { acceptHMRUpdate, defineStore } from 'pinia';
import { checkAuth } from '@/service/user/user.request';
import { LocalCache } from '@/utils';
import useUserStore from '@/stores/user.store';
import type { IUserInfo } from '@/stores/types/user.result';
/* 
Root Store 只保留 `showLoginDialog`/`showProfileDialog`/`profileEditForm`/`windowInfo` 
这四个真正的全局 UI 状态
其他之前分页相关的 state 和 action 全部删除。
*/
/**
 * 兼容历史 `userInfo` 缓存里 `id` 仍是字符串的情况。
 * 这类旧值在本地开发清缓存后通常可消失，但线上用户未退出登录时仍可能长期保留；
 * 因此恢复登录态时先把可安全转换的 `id` 归一化为 `number`，避免作者等 `===` 判断失效。
 */
function normalizeCachedUserInfo(userInfo: unknown): IUserInfo | undefined {
  if (!userInfo || typeof userInfo !== 'object') return undefined;

  const cachedUserInfo = userInfo as IUserInfo & { id?: number | string };
  if (cachedUserInfo.id == null) return cachedUserInfo;

  const normalizedId = Number(cachedUserInfo.id);
  if (Number.isNaN(normalizedId)) return cachedUserInfo;

  return {
    ...cachedUserInfo,
    id: normalizedId,
  };
}

const useRootStore = defineStore('root', {
  state: () => ({
    showLoginDialog: false as boolean,
    showProfileDialog: false as boolean,
    profileEditForm: {} as Partial<IUserInfo>,
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
    toggleProfileDialog() {
      this.showProfileDialog = !this.showProfileDialog;
    },
    setProfileEditForm(form: Partial<IUserInfo>) {
      this.profileEditForm = form;
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
      } catch (error: unknown) {
        console.error('Token验证请求失败:', error);
        const status = typeof error === 'object' && error !== null && 'response' in error ? (error as { response?: { status?: number } }).response?.status : undefined;
        if (status === 401) return false;
        // 网络错误时不强制登出,返回true允许继续使用
        return true;
      }
    },
    async loadLoginAction() {
      const userStore = useUserStore();
      const token = LocalCache.getCache('token');
      token && (userStore.token = token);
      const userInfo = normalizeCachedUserInfo(LocalCache.getCache('userInfo'));
      if (userInfo) {
        userStore.userInfo = userInfo;
        LocalCache.setCache('userInfo', userInfo);
      }
    },
  },
});

// 开发态：保存本文件时让 Vite 对该模块做自接受 HMR，并由 Pinia 把新的 actions/getters 定义合并到已有 store 实例上。
// 收益：改 store 逻辑时尽量不整页刷新、并保留当前内存中的 state；若去掉 acceptHMRUpdate，常见是整页重载或仍执行旧的 action 实现。
// 不影响运行时：业务里修改 state 是否驱动视图更新，仍由响应式负责，与此处无关。
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRootStore, import.meta.hot));
}

export default useRootStore;
