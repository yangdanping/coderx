const TIME_OUT = 10000;
const BASE_URL = import.meta.env.VITE_BASE_URL;
const MODE = import.meta.env.MODE;

console.log('当前环境', MODE, '当前BASE_URL', BASE_URL);

export { BASE_URL, TIME_OUT }; //注意这个不是对象,而是ESModule的语法
