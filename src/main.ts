import App from './App.vue';
import { createApp } from 'vue';
import init from '@/global';
console.log(import.meta.env.PORT); // undefined
console.log(import.meta.env.VITE_BASE_URL); // /dev-api

init(createApp(App));
