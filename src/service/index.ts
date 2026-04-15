// service统一的出口
import { LocalCache, Msg } from '@/utils';
import MyRequest from '@/global/request';
import { BASE_URL, NEWS_BASE_URL, TIME_OUT } from '@/global/request/config';
import useUserStore from '@/stores/user.store';

//new--->执行构造器--->创建一个唯一的实例(已在构造器里用axios.create()的前提下)
// 一般情况下只有一个实例,以后项目就用这一个实例去用它的request/get/post/...(除非你有不同baseURL,那就要创建第二个实例)
const myRequest = new MyRequest({
  baseURL: BASE_URL,
  timeout: TIME_OUT,
  interceptors: {
    reqSuccess: (config) => {
      // console.log('请求成功拦截', config);
      // 1.拦截器作用一 --> 携带token的拦截
      const token = LocalCache.getCache('token') ?? '';
      if (token) {
        // 最新axios要加非空类型断言写成对象格式
        config.headers!.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    reqFail: (err) => {
      // console.log('请求失败拦截', err);
      return Promise.reject(err);
    },
    // ----------------------------
    resSuccess: (res) => {
      return res;
    },
    resFail: (err) => {
      // console.log('响应失败拦截');
      const { msg, code } = err.response.data;

      // 🔧 开发调试：在控制台打印关键错误信息
      console.error(`❌ [API Error] ${err.config?.method?.toUpperCase()} ${err.config?.url} → ${code}: ${msg}`);

      // 🎯 UI 提示：根据错误类型显示不同信息
      if (code === 401) {
        Msg.showWarn(`已过期,请重新登录`);
        useUserStore().logOut();
      } else {
        // 开发环境：显示详细错误（msg 可能包含 [DEV] 前缀）
        // 生产环境：显示通用错误
        const isDev = msg?.startsWith('[DEV]');
        const displayMsg = isDev ? msg : '操作失败，请稍后重试';
        Msg.showFail(displayMsg);
      }
      return Promise.reject(err);
    },
  },
});
const newsRequest = new MyRequest({
  baseURL: NEWS_BASE_URL,
  timeout: TIME_OUT,
  interceptors: {
    reqSuccess: (config) => {
      return config;
    },
    reqFail: (err) => {
      return Promise.reject(err);
    },
    resSuccess: (res) => {
      return res;
    },
    resFail: (err) => {
      return Promise.reject(err);
    },
  },
});

export { newsRequest };

export default myRequest;
