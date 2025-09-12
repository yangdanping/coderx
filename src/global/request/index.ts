import axios from 'axios'; //对axios做封装只需在这一个文件里引用axios就可以了(相当于当前项目对axios有依赖的只有该文件)
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'; //axios已提供对应的类型(三者缺一不可)
import { ElLoading } from 'element-plus';
import type { LoadingInstance } from 'element-plus/lib/components/loading/src/loading';
import useLoadingStore from '@/stores/loading';
const DEAFULT_LOADING = true;

/* 由于我们对拦截器做了三层封装,所以传类型得一步步传递过去
由于this.instance.request拿到的res的类型是由调用者决定的T类型,但默认情况下
config.interceptors.resSuccess(res)中的res在上次不改的情况下默认是AxiosResponse类型,与T不匹配,
得想办法把AxiosResponse类型改为T类型,则从this.instance.request加入泛型开始一步一步做
request<any,T>中的T --> MyRequestConfig<T> --> MyRequestInterceptors<T> --> resSuccess?: (res: T) => T */

// 我们这里给接口定义泛型,为了使拦截器能够接受我们自己在request中定义的泛型参数T
// 注意!!!!接口是可以用泛型(并且最好有默认类型),而接口里的函数用不了泛型
interface MyRequestInterceptors<T = AxiosResponse, D = AxiosRequestConfig & any> {
  reqSuccess?: (config: D) => D; //函数类型,该函数参数是AxiosRequestConfig类型的config,返回值也是该类型
  reqFail?: (error: any) => any;
  resSuccess?: (res: T) => T;
  resFail?: (error: any) => any;
}

// 定义MyRequestConfig,继承自官方提供的接口(把构造器中config:AxiosRequestConfig换成config:MyRequestConfig)
interface MyRequestConfig<T = AxiosResponse> extends AxiosRequestConfig {
  // 对原来的ARC类型做扩展(在原来的基础上增添了可选的interceptors属性)
  interceptors?: MyRequestInterceptors<T>; //注意!当MyRequestInterceptors的类型参数不再是默认的AxiosResponse类型时,要通过MyRequestConfig的接口给他传入泛型
  showLoading?: boolean; //showLoading控制各个请求是否显示loading
  loadingKey?: string; //loadingKey控制各个请求的loadingKey
}

class MyRequest {
  // 属性
  instance: AxiosInstance;
  interceptors?: MyRequestInterceptors;
  loading?: LoadingInstance; //loading保存Loading实例,先有实例才能用showLoading控制是否显示
  showLoading: boolean; //showLoading控制整体请求是否显示loading
  // 构造方法
  constructor(config: MyRequestConfig) {
    // 1.创建axios实例 --> (一切的起点,非常重要,我们之前用axios本质上是用axios对象的一个实例)
    this.instance = axios.create(config);
    // 2.保存基本信息 --> 把别人传进来所有拦截器函数保存到interceptors属性中
    this.interceptors = config.interceptors;
    this.showLoading = config.showLoading ?? DEAFULT_LOADING; //默认情况下显示Loading,当某个请求不希望有Loading是就可以在该请求单独配置showLoading:false

    // 3.使用拦截器
    // 创建的实例自己的拦截器 --> (把别人传进来的拦截函数放到实例里的拦截器给他做一个应用,注意写成可选链)
    this.instance.interceptors.request.use(this.interceptors?.reqSuccess, this.interceptors?.reqFail);
    this.instance.interceptors.response.use(this.interceptors?.resSuccess, this.interceptors?.resFail);

    // 全局拦截器 --> (把别人传进来的拦截函数放到实例里的拦截器给他做一个应用,注意写成可选链)
    this.instance.interceptors.request.use(
      (config: any) => {
        // const key = config.loadingKey ?? 'global';
        if (this.showLoading) {
          const loadingStore = useLoadingStore();
          config.loadingKey && console.log('我是全局请求拦截器===========================', '可以按key触发loading', config.loadingKey);
          loadingStore.start(config.loadingKey ?? 'global');
        }
        // console.log('全局请求拦截器请求成功');
        // 将返回的loading组件实例赋值给loading属性,与showLoading配合控制loading开关
        // if (this.showLoading) {
        //   this.loading = ElLoading.service({
        //     lock: true,
        //     text: '正在请求...',
        //     background: 'rgba(0,0,0,0.5)',
        //   });
        // }
        return config;
      },
      (err) => err,
    );
    this.instance.interceptors.response.use(
      (res: any) => {
        // console.log('全局响应拦截器响应成功');
        // 请求成功后将loading移除(请求失败也得移除)
        // this.loading?.close();
        const realData = res.data; //取出服务器返回的真实数据
        if (this.showLoading) {
          const loadingStore = useLoadingStore();
          res.config.loadingKey && console.log('接口响应拦截器 停止loading', res.config.loadingKey);
          loadingStore.end(res.config.loadingKey ?? 'global');
        }
        return realData;

        // 这里模拟数据响应失败时的情况
        // if (realData.returnCode === '-1001') {
        //   console.log('请求失败,将错误信息显示在界面(组件)上');
        // } else {
        //   return realData; //返回res.data就保证了我拿到的res就是我想要的数据了
        // }
      },
      (err) => {
        // this.loading?.close();
        // 判断不同的HttpErrorCode显示不同的错误信息
        if (err.response.status === 404) {
          console.log('404的错误~'); //真实开发是switch根据status的不同显示不同的错误信息
        }
      },
    );
  }
  // 封装request等请求 --> (要在内部做单个请求的拦截器,所以把config:AxiosRequestConfig换成config:MyRequestConfig)
  // 注意!这里改config的类型为MyRequestConfig
  // 返回Promise,在调用时可拿到结果,想要结果类型由请求者决定,所以这里用泛型
  request<T = any>(config: MyRequestConfig<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.showLoading = config.showLoading ?? true; //类型缩小(注意!,为了不影响下一个请求,请求完后(成功/失败)应当设置回初始化值)

      console.log('我是request方法===========================');

      // 单个请求的请求拦截器,若有reqSuccess函数,那我在内部执行一些这个函数就可以了(把拦截器函数返回的转化后的config替换掉原生config)
      if (config.interceptors?.reqSuccess) {
        config = config.interceptors.reqSuccess(config);
      }

      // 请求的真正入口(重点!为了使外面可自定义res类型,设置request的泛型,且易知第二个泛型参数T是作为res的类型)
      this.instance
        .request<any, T>(config)
        .then((res) => {
          // 1.单个请求的响应拦截器,对数据的处理-----------------------------------------
          if (config.interceptors?.resSuccess) {
            res = config.interceptors.resSuccess(res);
          }
          // 2.将showLoading设置为默认值,这样不会影响下一个请求
          this.showLoading = DEAFULT_LOADING;
          // 3.将结果resolve返回出去,在外面就可调用then来获取res
          resolve(res);
          // return res;
        })
        .catch((err) => {
          // 将showLoading设置为默认值,这样不会影响下一个请求
          this.showLoading = DEAFULT_LOADING;
          resolve(err);
          return err;
        });
    });
  }

  //get是调用request的,但同时明确请求方式为GET,下面同理
  get<T = any>(config: MyRequestConfig<T>): Promise<T> {
    // 处理params参数，将其拼接到URL上
    let finalUrl = config.url || '';

    if (config.params && typeof config.params === 'object') {
      // 将params对象转换为URL参数字符串
      const searchParams = new URLSearchParams();

      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          const isObject = Array.isArray(value) || typeof value === 'object'; // 数组和对象类型使用JSON.stringify进行序列化
          searchParams.append(key, isObject ? JSON.stringify(value) : String(value));
        }
      });

      const queryString = searchParams.toString();
      if (queryString) {
        // 检查URL是否已经包含查询参数
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}${queryString}`;
      }
    }

    // 创建新的config，移除params并使用拼接后的URL
    const { params, ...restConfig } = config;

    return this.request<T>({
      ...restConfig,
      url: finalUrl,
      method: 'GET',
    });
  }
  post<T = any>(config: MyRequestConfig<T>): Promise<T> {
    return this.request<T>({ ...config, method: 'POST' });
  }
  patch<T = any>(config: MyRequestConfig<T>): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH' });
  }
  put<T = any>(config: MyRequestConfig<T>): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT' });
  }
  delete<T = any>(config: MyRequestConfig<T>): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE' });
  }
}

export default MyRequest;
