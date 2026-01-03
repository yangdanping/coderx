// service统一的出口
import { LocalCache, Msg, recursiveReplace } from '@/utils';
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
        // eslint-disable-next-line
        config.headers!.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    reqFail: (err) => {
      // console.log('请求失败拦截', err);
      return err;
    },
    // ----------------------------
    resSuccess: (res) => {
      // console.log('响应成功拦截', res);
      if (res && res.data) {
        // 去除BASE_URL末尾可能的斜杠
        const targetBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

        // 🚀 一次性替换多个可能的源地址（只遍历一次数据结构，性能优化）
        // 替换顺序：从具体到通用，避免误替换
        res.data = recursiveReplace(res.data, targetBaseUrl, [
          // 阿里云 Ubuntu服务器
          'http://8.138.223.188:8000', // 生产环境（带端口）
          'http://8.138.223.188', // 生产环境（不带端口）
          // AWS Debian服务器
          'http://95.40.29.75:8000', // 生产环境（带端口）
          'http://95.40.29.75', // 生产环境（不带端口）
          // 本地开发环境
          'http://localhost:8000', // 开发环境
        ]);
      }
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
      return err;
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
      return err;
    },
    resSuccess: (res) => {
      return res;
    },
    resFail: (err) => {
      return err;
    },
  },
});

export { newsRequest };

export default myRequest;
