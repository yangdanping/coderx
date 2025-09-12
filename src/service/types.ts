import type { RouteParamValue } from 'vue-router';

/**
 * 定义获取到返回数据的类型,属性取决于你获取到什么数据
 * @param code 状态码
 * @param data 最终有token的登录结果数据,也要定义类型
 * @param msg 请求失败消息
 */
export interface IResData<T = any> {
  code: number;
  data: T;
  msg?: string;
}

export interface IPage {
  offset?: number;
  limit?: number;
}

export type RouteParam = RouteParamValue | RouteParamValue[];
