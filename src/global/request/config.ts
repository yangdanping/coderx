/* 在当前项目里识别环境的重要性
因为在不同的环境里,我们对应的有些变量的值是不一样的
这里有三种方式去区分不同的环境 */

// 方式一:手动的切换不同的环境(不推荐)
// const BASE_URL = 'http://coderwhy.org.dev';
// const BASE_NAME = 'coderwhy';
// const BASE_URL = 'http://coderwhy.org.prod';
// const BASE_NAME = 'kebo';
// const BASE_URL = 'http://coderwhy.org.test';
// const BASE_NAME = 'james';

/* 前情提要:process.env.NODE_ENV会根据DefinePlugin注入不同的值
开发环境:development 生产环境:prodoct 测试环境:test*/
// 方式二:根据process.env.NODE_ENV(我们项目用的方式)
let BASE_URL = '';
const TIME_OUT = 10000;

if (process.env.NODE_ENV === 'development') {
  BASE_URL = '/api'; //开发阶段已配置proxy选项解决跨域问题,生产环境到时再说
} else if (process.env.NODE_ENV === 'production') {
  BASE_URL = 'http://coderwhy.org/prod';
} else {
  BASE_URL = 'http://coderwhy.org/test';
}

export { BASE_URL, TIME_OUT }; //注意这个不是对象,而是ESModule的语法

// 方式三:在每个独立的配置文件里配置对应的环境变量,然后在shims-vue.d.ts中declare
/* 官网原话:注意!!!只有NODE_ENV/BASE_URL/以VUE_APP_开头的变量将通过
webpack.DefinePlugin 静态地嵌入到客户端侧的代码中
这是为了避免意外公开机器上可能具有相同名称的私钥
到时候npm run serve 就会使用开发环境下.env.development的环境变量
到时候npm run build 就会使用生产环境下.env.production的环境变量
*/
