import path from 'path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import pxtorem from 'postcss-pxtorem';

const pathSrc = fileURLToPath(new URL('./src', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    publicDir: 'public', // 作为静态资源服务的文件夹 默认public
    build: {
      outDir: 'build', // 打包文件的输出目录
      // outDir: 'coderx', // 打包文件的输出目录
      target: 'baseline-widely-available', // 设置最终构建的浏览器兼容目标。默认值：：'baseline-widely-available'
      assetsDir: 'assets', // 指定生成静态资源的存放路径 默认assets
      emptyOutDir: true, // 打包前先清空原有打包文件
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    // 🎯 CSS 配置：PostCSS pxtorem 自动转换
    css: {
      postcss: {
        plugins: [
          pxtorem({
            rootValue: 16, // 根元素字体大小基准值（与设计稿对应）
            propList: ['*'], // 所有属性都进行转换
            selectorBlackList: [
              'el-', // Element Plus 组件不转换
              'w-e-', // WangEditor 组件不转换
            ],
            exclude: /node_modules/i, // 排除 node_modules 目录
            mediaQuery: false, // 是否允许在媒体查询中转换 px
            minPixelValue: 1, // 小于1px的值不转换
          }),
        ],
      },
    },
    server: {
      port: 8080,
      open: true,
      proxy: {
        '/dev-api': {
          target: 'http://localhost:8000', //接口的前缀
          changeOrigin: true, //支持跨域
          rewrite: (path) => path.replace(/^\/dev-api/, ''), //重写路径
        },
        '/dev-laptop-api': {
          target: 'http://100.107.181.55:8000', //接口的前缀
          changeOrigin: true, //支持跨域
          rewrite: (path) => path.replace(/^\/dev-laptop-api/, ''), //重写路径
        },
        '/api': {
          // target: 'http://119.91.150.141:8000',
          target: 'http://8.138.223.188:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // '/news-api/': {
        //   target: 'https://gnews.io/api/v4',
        //   changeOrigin: true,
        //   rewrite: (path) => path.replace(/^\/news-api/, ''),
        // },
      },
    },
    plugins: [
      vue(),
      viteCompression(), //在客户端压缩,注意,服务器nginx那边要配置gzip_static on,使得优先使用这边压缩好的
      visualizer({
        emitFile: false,
        filename: 'stats.html', //分析图生成的文件名
        open: false, //如果存在本地服务端口,将在打包后自动展示
      }),
      AutoImport({
        // Auto import functions from Vue, e.g. ref, reactive, toRef...
        // 自动导入 Vue 相关函数,如：ref, reactive, toRef 等
        imports: ['vue', 'pinia', 'vue-router'],

        // Auto import functions from Element Plus, e.g. ElMessage, ElMessageBox... (with style)
        // 自动导入 Element Plus 相关函数,如：ElMessage, ElMessageBox... (带样式)
        resolvers: [
          ElementPlusResolver(),
          // Auto import icon components
          // 自动导入图标组件
          IconsResolver({ prefix: 'Icon' }),
        ],
        dts: path.resolve(pathSrc, 'auto-imports.d.ts'),
      }),

      Components({
        resolvers: [
          // Auto register icon components
          // 自动注册图标组件(自动导入图标需要i-ep-前缀,下面prefix和alias配置使其只用i-前缀)
          IconsResolver({ enabledCollections: ['ep'], prefix: false, alias: { i: 'ep' } }),
          // Auto register Element Plus components
          // 自动导入 Element Plus 组件
          ElementPlusResolver(),
        ],
        dts: path.resolve(pathSrc, 'components.d.ts'),
      }),

      Icons({
        autoInstall: true,
      }),
    ],
    resolve: {
      alias: {
        '@': pathSrc,
      },
    },
  };
});
