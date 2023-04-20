import { defineStore } from 'pinia';

// 第一个参数是该store的id
// 返回的是个函数,规范命名如下
const useUser = defineStore('user', {
  state: () => ({
    name: 'ydp',
    age: 24,
    level: 100
  })
});

// 与compositionAPI的用法类似
export default useUser;
