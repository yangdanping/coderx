import { onBeforeUnmount, ref, type Ref } from 'vue';
import { LocalCache, throttleByRaf } from '@/utils';

/**
 * 拖拽手柄的方向
 * - 边: left / right / top / bottom
 * - 角: top-left / top-right / bottom-left / bottom-right
 *
 * 方向本身就定义了"往哪边拖 = 变大"，例如：
 * - 拖 left 手柄：鼠标往左移动（clientX 减小）→ 宽度增大
 * - 拖 right 手柄：鼠标往右移动（clientX 增大）→ 宽度增大
 */
export type ResizeDirection = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface UseResizableOptions {
  /** 初始宽度（px） */
  initialWidth: number;
  /** 初始高度（px） */
  initialHeight: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  /** 传入后会把尺寸持久化到 localStorage；内部会加上命名空间，避免 key 冲突 */
  persistKey?: string;
}

export interface UseResizableReturn {
  width: Ref<number>;
  height: Ref<number>;
  isResizing: Ref<boolean>;
  /** 绑到手柄 @mousedown 上即可 */
  startResize: (direction: ResizeDirection, event: MouseEvent) => void;
}

const PERSIST_NAMESPACE = 'useResizable';

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const directionToCursor = (direction: ResizeDirection): string => {
  switch (direction) {
    case 'left':
    case 'right':
      return 'ew-resize';
    case 'top':
    case 'bottom':
      return 'ns-resize';
    case 'top-left':
    case 'bottom-right':
      return 'nwse-resize';
    case 'top-right':
    case 'bottom-left':
      return 'nesw-resize';
  }
};

/**
 * 通用的"可拖拽调整大小"能力，返回响应式 width/height 与 startResize 方法。
 *
 * 使用方只负责：把 width/height 绑到元素 style、把 startResize 挂到手柄 @mousedown 上。
 * 边界约束、事件挂载/清理、localStorage 持久化、rAF 节流，全部在内部完成。
 */
export function useResizable(options: UseResizableOptions): UseResizableReturn {
  const { initialWidth, initialHeight, minWidth = 0, maxWidth = Number.POSITIVE_INFINITY, minHeight = 0, maxHeight = Number.POSITIVE_INFINITY, persistKey } = options;

  const cacheKey = persistKey ? `${PERSIST_NAMESPACE}:${persistKey}` : null;

  const loadPersistedSize = (): { width: number; height: number } => {
    if (!cacheKey) return { width: initialWidth, height: initialHeight };
    try {
      const saved = LocalCache.getCache(cacheKey);
      if (saved && typeof saved.width === 'number' && typeof saved.height === 'number') {
        return {
          width: clamp(saved.width, minWidth, maxWidth),
          height: clamp(saved.height, minHeight, maxHeight),
        };
      }
    } catch {
      // 忽略：隐私模式、存储损坏等场景下落回初始值
    }
    return { width: initialWidth, height: initialHeight };
  };

  const persistSize = () => {
    if (!cacheKey) return;
    try {
      LocalCache.setCache(cacheKey, { width: width.value, height: height.value });
    } catch {
      // 忽略：配额溢出等场景
    }
  };

  const initial = loadPersistedSize();
  const width = ref(initial.width);
  const height = ref(initial.height);
  const isResizing = ref(false);

  // 这些量只在 move 回调里读，不参与模板/computed，普通变量即可，避免多余的响应式开销
  let activeDirection: ResizeDirection | null = null;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  // mousemove 是按鼠标精度触发的，而屏幕是按刷新率显示的
  // 两者频率不匹配时，中间多算的那几次就是纯浪费
  // throttleByRaf 的作用就是强制把"改视觉"的频率对齐到屏幕刷新率，一帧一次、永远用最新值，既不卡也不丢末态
  /* 
  帧 1 (8.3ms)
  ↓ mousemove 触发 3 次
  第 1 次：加锁，约好"下一帧再执行"，记录参数
  第 2 次：已锁定，只更新参数（覆盖掉上次）
  第 3 次：已锁定，只更新参数（覆盖掉上次）
  浏览器进入下一帧前的 rAF 回调：用最新的那次参数执行 → 写 DOM
  解锁
  帧 2
  ... 同样合并 ...
  每帧只算一次，而且一定是用最新的鼠标位置。 既没有浪费，也不会丢掉"最终状态"。
  */
  const handleResize = throttleByRaf((event: MouseEvent) => {
    if (!isResizing.value || !activeDirection) return;

    const affectsLeft = activeDirection.includes('left');
    const affectsRight = activeDirection.includes('right');
    const affectsTop = activeDirection.includes('top');
    const affectsBottom = activeDirection.includes('bottom');

    if (affectsLeft || affectsRight) {
      const deltaW = affectsLeft ? startX - event.clientX : event.clientX - startX;
      width.value = clamp(startWidth + deltaW, minWidth, maxWidth);
    }
    if (affectsTop || affectsBottom) {
      const deltaH = affectsTop ? startY - event.clientY : event.clientY - startY;
      height.value = clamp(startHeight + deltaH, minHeight, maxHeight);
    }
  });

  const teardown = () => {
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  function stopResize() {
    if (!isResizing.value) return;
    isResizing.value = false;
    activeDirection = null;
    handleResize.cancel?.();
    teardown();
    persistSize();
  }

  const startResize = (direction: ResizeDirection, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    isResizing.value = true;
    activeDirection = direction;
    startX = event.clientX;
    startY = event.clientY;
    startWidth = width.value;
    startHeight = height.value;

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = directionToCursor(direction);
    document.body.style.userSelect = 'none';
  };

  // 组件卸载时兜底清理：防止用户按住鼠标的同时组件被销毁，事件监听与 body 样式残留
  onBeforeUnmount(() => {
    if (isResizing.value) {
      isResizing.value = false;
      activeDirection = null;
      handleResize.cancel?.();
      teardown();
    }
  });

  return {
    width,
    height,
    isResizing,
    startResize,
  };
}
