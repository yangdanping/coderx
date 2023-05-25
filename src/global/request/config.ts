const TIME_OUT = 10000;
const BASE_URL = import.meta.env.VITE_BASE_URL;
const MODE = import.meta.env.MODE;
const SOCKET_URL = MODE === 'development' ? 'http://localhost:3001' : 'http://119.91.150.141:3001';

console.log('当前环境', MODE, '当前BASE_URL', BASE_URL, '当前SOCKET_URL', SOCKET_URL);

export { BASE_URL, TIME_OUT, SOCKET_URL }; //注意这个不是对象,而是ESModule的语法
