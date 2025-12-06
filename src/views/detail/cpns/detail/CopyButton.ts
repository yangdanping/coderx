import { h, ref } from 'vue';
import { CopyDocument } from '@element-plus/icons-vue';

export const CopyButton = {
  props: ['text'],
  setup(props: { text: string }) {
    const isCopied = ref(false);

    const handleCopy = async () => {
      const copyText = props.text;
      // 尝试使用 clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(copyText);
          showSuccess();
          return;
        } catch (err) {
          console.warn('clipboard API failed, trying fallback...', err);
        }
      }

      // 降级方案：使用 textarea 和 execCommand
      try {
        const textarea = document.createElement('textarea');
        textarea.value = copyText;
        textarea.style.position = 'fixed'; // 避免滚动到底部
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) {
          showSuccess();
        } else {
          console.error('Fallback copy failed.');
        }
      } catch (err) {
        console.error('Fallback copy error:', err);
      }
    };

    const showSuccess = () => {
      isCopied.value = true;
      setTimeout(() => {
        isCopied.value = false;
      }, 2000);
    };

    return () =>
      h(
        'div',
        {
          class: 'code-copy-btn',
          onClick: handleCopy,
        },
        [
          isCopied.value ? h('span', { class: 'copy-text' }, 'Copied!') : null,
          h(CopyDocument, { style: { width: '1em', height: '1em' } }), // 直接设置 svg 样式确保显示
        ],
      );
  },
};
