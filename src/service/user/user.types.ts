/**
 * 定义账号登录类型
 * @param name 用户名称
 * @param password 用户密码
 */
export interface IAccount {
  name: string;
  password: string;
}

/* 真实开发中是拿到用户数据只会更多的,一开始按下登录按钮,给到我们数据只有这三个
id,name,token,其实我们拿到用户数据的话,里面的东西会更多的,以下统称为用户信息数据
比如当前用户的手机号码/什么时候创建的/角色名/角色id/部门名等...,
但我并没有在登录成功后直接给他这些数据,而是登录成功后再发送请求用户信息数据 */

/**
 * 定义登录结果data属性的类型,具体有什么看文档,一般要拿到token
 * 属性取决于你获取的data属性里有什么字段
 * @param id 用户id
 * @param name 用户名称
 * @param token 用户token
 */
export interface ILoginResult {
  id: number;
  name: string;
  token: string;
}

// 可以定义用户类型IUserResult,但这里为了方便取any(真正与用户相关的真实数据,注意可能有些是可选的,具体有什么看文档,可用json2ts.com生成)-------------------------------------------
