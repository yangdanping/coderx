import { dateFormat } from '@/utils';
import type { App } from 'vue';
import type { LoadingInstance } from 'element-plus/lib/components/loading/src/loading';
import { ElLoading } from 'element-plus';
export default function initDirective(app: App) {
  const dateFormatter = (el, binding) => {
    const time = binding.value;
    if (time) {
      el.innerHTML = dateFormat(time, binding.arg);
    }
  };
  app.directive('dateformat', {
    mounted(el, binding) {
      dateFormatter(el, binding);
    },
    updated(el, binding) {
      dateFormatter(el, binding);
    },
  });

  // 自定义loading指令 - 使用Element Plus的ElLoading
  const loadingHandler = (el: HTMLElement, binding: any) => {
    const isLoading = binding.value;

    // 从element上获取已存在的loading实例
    const existingLoading = (el as any).__loadingInstance;

    if (isLoading) {
      // 如果没有loading实例，创建一个新的
      if (!existingLoading) {
        const loadingInstance = ElLoading.service({
          target: el,
          lock: true,
          text: binding.arg || '加载中...',
          background: 'rgba(0, 0, 0, 0.5)',
          customClass: 'custom-directive-loading',
        });

        // 将loading实例保存到element上
        (el as any).__loadingInstance = loadingInstance;
      }
    } else {
      // 关闭loading
      if (existingLoading) {
        existingLoading.close();
        (el as any).__loadingInstance = null;
      }
    }
  };

  app.directive('loading', {
    mounted(el, binding) {
      loadingHandler(el, binding);
    },
    updated(el, binding) {
      loadingHandler(el, binding);
    },
    unmounted(el) {
      // 组件卸载时清理loading
      const existingLoading = (el as any).__loadingInstance;
      if (existingLoading) {
        existingLoading.close();
        (el as any).__loadingInstance = null;
      }
    },
  });
}
