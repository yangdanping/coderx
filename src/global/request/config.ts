const TIME_OUT = 10000;
const BASE_URL = process.env.NODE_ENV === 'development' ? '/dev-api' : '/api';
console.log('当前环境', process.env.NODE_ENV, '当前BASE_URL', BASE_URL);
export { BASE_URL, TIME_OUT }; //注意这个不是对象,而是ESModule的语法

// 方式三:在每个独立的配置文件里配置对应的环境变量,然后在shims-vue.d.ts中declare
/* 官网原话:注意!!!只有NODE_ENV/BASE_URL/以VUE_APP_开头的变量将通过
webpack.DefinePlugin 静态地嵌入到客户端侧的代码中
这是为了避免意外公开机器上可能具有相同名称的私钥
到时候npm run serve 就会使用开发环境下.env.development的环境变量
到时候npm run build 就会使用生产环境下.env.production的环境变量
*/
