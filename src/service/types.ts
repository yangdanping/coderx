/**
 * 定义获取到返回数据的类型,属性取决于你获取到什么数据
 * @param code 状态码
 * @param data 最终有token的登录结果数据,也要定义类型
 */
export interface IDataType<T = any> {
  code: number;
  data: T;
}
