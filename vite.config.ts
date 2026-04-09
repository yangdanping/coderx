import path from 'path';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { visualizer } from 'rollup-plugin-visualizer';
import pxtorem from 'postcss-pxtorem';
import glsl from 'vite-plugin-glsl';

const pathSrc = fileURLToPath(new URL('./src', import.meta.url));

// https:/vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      vue(),
      glsl(),
      visualizer({
        emitFile: false,
        filename: 'stats.html', //分析图生成的文件名
        open: false, //如果存在本地服务端口,将在打包后自动展示
      }),
      AutoImport({
        imports: ['vue', 'pinia', 'vue-router'], // 自动导入 Vue 相关函数,如：ref, reactive, toRef 等
        resolvers: [
          ElementPlusResolver(), // 样式见全局 index.css，此处不再按需注入
          IconsResolver({ prefix: 'Icon' }), // 自动导入图标组件
        ],
        dts: path.resolve(pathSrc, 'auto-imports.d.ts'),
      }),
      Components({
        resolvers: [
          ElementPlusResolver(), // 样式见全局 index.css，此处不再按需注入
          IconsResolver({ enabledCollections: ['ep'], prefix: false, alias: { i: 'ep' } }), // 自动注册图标组件(自动导入图标需要i-ep-前缀,下面prefix和alias配置使其只用i-前缀)
        ],
        dts: path.resolve(pathSrc, 'components.d.ts'),
      }),
      Icons({ autoInstall: true }),
    ],
    build: {
      target: 'baseline-widely-available', // 设置最终构建的浏览器兼容目标。默认值：'baseline-widely-available'
      rolldownOptions: {
        output: {
          // 清空控制台打印
          minify: {
            compress: {
              dropConsole: true,
            },
          },
          // 框架与业务分离
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // 1. 核心框架
              if (/(^|\/)vue($|\/)|(^|\/)vue-router($|\/)|(^|\/)pinia($|\/)/.test(id)) {
                return 'vue-core';
              }
              // 2. 通用工具库 (合并了 @tanstack, axios, dayjs)
              if (id.includes('@tanstack') || id.includes('axios') || id.includes('dayjs')) {
                return 'common-utils';
              }
              // 3. 巨型编辑器库 (按需加载/独立缓存)
              if (id.includes('@tiptap') || id.includes('prosemirror')) {
                return 'editor-vendor';
              }
              // 4. 语法高亮
              if (id.includes('highlight.js')) {
                return 'syntax-highlight';
              }
              // 5. 地址级联选择器
              if (id.includes('element-china-area-data')) {
                return 'element-china-area-data';
              }
            }
          },
        },
      },
    },
    server: {
      port: Number(env.PORT),
      host: env.HOST,
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
          // target: 'http://119.91.150.141:8000', // 腾讯云（已下线）
          // target: 'http://8.138.223.188:8000', // 阿里云（已下线）
          target: 'http://18.166.177.129:8000', // AWS
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
    // 🎯 CSS 配置：PostCSS pxtorem 自动转换
    css: {
      // vite 配置 全局注入css,避免组件 <style> 顶部手动 @use;
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/assets/css/utils.scss" as *;`,
        },
      },
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
    resolve: {
      alias: {
        '@': pathSrc,
      },
    },
  };
});
