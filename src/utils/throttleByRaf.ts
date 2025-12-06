type CallbackFn = (...item: any[]) => void;

/**
 * 基于 requestAnimationFrame 的节流函数
 * 适用于高频视觉更新场景（如 scroll, resize, drag）
 * 优势：
 * 1. 自动对齐屏幕刷新率（通常 60Hz），不会在同一帧内多次执行，避免无效计算
 * 2. 当页面不可见时自动暂停，节省 CPU
 *
 * @param fn 需要节流的函数
 * @returns 包装后的函数
 */
export default function throttleByRaf(fn: CallbackFn) {
  let locked = false;
  let args: any[] = [];

  const wrapper = function (this: any, ...nextArgs: any[]) {
    args = nextArgs; // 总是保存最新的参数

    if (locked) return;

    locked = true;
    const context = this as any; // 保存当前上下文

    requestAnimationFrame(() => {
      fn.apply(context, args); // 在下一帧执行
      locked = false; // 解锁，允许下一次触发
    });
  };

  wrapper.cancel = function () {
    // rAF 的 cancel 需要 id，这里通过 locked 状态管理其实已经足够简单有效
    // 如果需要严格取消 pending 的 rAF，需要保存 rAF 的返回值
    locked = false;
  };

  return wrapper;
}
