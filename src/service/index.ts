// service统一的出口
import { LocalCache } from '@/utils';
import MyRequest from '@/global/request';
import { BASE_URL, TIME_OUT } from '@/global/request/config';
//new--->执行构造器--->创建一个唯一的实例(已在构造器里用axios.create()的前提下)
// 一般情况下只有一个实例,以后项目就用这一个实例去用它的request/get/post/...(除非你有不同baseURL,那就要创建第二个实例)
const myRequest = new MyRequest({
  baseURL: BASE_URL,
  timeout: TIME_OUT,
  interceptors: {
    reqSuccess: (config) => {
      console.log('请求成功拦截', config);
      // 1.拦截器作用一 --> 携带token的拦截
      const token =
        LocalCache.getCache('token') ??
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6InlkcCIsImlhdCI6MTY4MjI0MTc3NywiZXhwIjoxNjgyMzI4MTc3fQ.MWZ8NJF9UDT-jnbyffQb2_IExVjht1S_jO0zv4jiyWCRcodQlDZCCy-HlqNfBoLYwMX4cVe-hN6YbA3U5hwH_7QVKNlNHvzNpN-Bsp7Ho3yLhcL5N1cxuRMhzbAHJy24zVgBCMC-9jryeQcVs8fC2Em946ZQbPE0l-c2eddYkoA';
      if (token) {
        // 最新axios要加非空类型断言写成对象格式
        // eslint-disable-next-line
        config.headers!.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    reqFail: (err) => {
      // console.log('请求失败拦截');
      return err;
    },
    // ----------------------------
    resSuccess: (res) => {
      // console.log('响应成功拦截');
      return res;
    },
    resFail: (err) => {
      // console.log('响应失败拦截');
      return err;
    }
  }
});

export default myRequest;
