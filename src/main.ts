import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import 'normalize.css';
import './assets/css/index.scss';
import 'element-plus/dist/index.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');

console.log('当前环境', process.env.NODE_ENV, '接口', process.env.VUE_APP_BASE_URL);
