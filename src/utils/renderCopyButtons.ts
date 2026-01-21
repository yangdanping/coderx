import { render, h } from 'vue';
import { CopyButton } from '@/views/detail/cpns/detail/CopyButton';

export const renderCopyButtons = (el: HTMLElement) => {
  if (!el) return;
  // 查找所有 pre 标签
  const pres = el.querySelectorAll('pre');
  pres.forEach((pre) => {
    // 避免重复挂载
    if (pre.querySelector('.code-copy-btn')) return;

    // 设置相对定位
    pre.style.position = 'relative';

    // 获取代码文本
    const text = pre.innerText || pre.textContent || '';

    // 创建容器
    const container = document.createElement('div');
    pre.appendChild(container);

    // 渲染组件
    render(h(CopyButton, { text }), container);
  });
};
