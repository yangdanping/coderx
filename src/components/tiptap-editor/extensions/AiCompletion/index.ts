/**
 * AI 编辑补全 Tiptap Extension
 * 提供光标处的词/句补全建议
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { fetchCompletion } from './api';
import type { AiCompletionOptions, CompletionSuggestion, CompletionState, PopoverPosition } from './types';

// Plugin Key
export const AiCompletionPluginKey = new PluginKey('aiCompletion');

// 默认配置
const DEFAULT_OPTIONS: AiCompletionOptions = {
  debounceMs: 500,
  minTriggerLength: 10,
  contextWindow: 500,
  maxSuggestions: 3,
};

// 触发模式：标点符号后触发
const TRIGGER_PATTERNS = [
  /[。！？，；：、]$/, // 中文标点
  /[.!?,;:]$/, // 英文标点
  /\s$/, // 空格后
];

// 检测是否满足触发条件
function shouldTrigger(beforeText: string, minLength: number): boolean {
  if (beforeText.length < minLength) return false;
  return TRIGGER_PATTERNS.some((p) => p.test(beforeText));
}

// 获取光标位置（用于定位弹出框）
function getCursorCoords(view: EditorView): PopoverPosition | null {
  const { state } = view;
  const { from } = state.selection;

  try {
    const coords = view.coordsAtPos(from);
    const editorRect = view.dom.getBoundingClientRect();

    return {
      top: coords.bottom - editorRect.top + 4, // 光标下方 4px
      left: coords.left - editorRect.left,
    };
  } catch {
    return null;
  }
}

// 声明命令类型扩展
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiCompletion: {
      // 触发补全请求
      triggerCompletion: () => ReturnType;
      // 应用补全建议
      applyCompletion: (text: string) => ReturnType;
      // 关闭补全弹出框
      dismissCompletion: () => ReturnType;
    };
  }
}

export const AiCompletion = Extension.create<AiCompletionOptions>({
  name: 'aiCompletion',

  addOptions() {
    return DEFAULT_OPTIONS;
  },

  addStorage() {
    return {
      // 当前状态
      state: 'idle' as CompletionState,
      // 补全建议
      suggestions: [] as CompletionSuggestion[],
      // 弹出框位置
      position: null as PopoverPosition | null,
      // 当前选中索引
      activeIndex: 0,
      // 防抖定时器
      debounceTimer: null as ReturnType<typeof setTimeout> | null,
      // 状态更新回调（由 Vue 组件注册）
      onStateChange: null as ((state: CompletionState, suggestions: CompletionSuggestion[], position: PopoverPosition | null) => void) | null,
    };
  },

  addCommands() {
    return {
      triggerCompletion:
        () =>
        ({ editor }) => {
          const storage = this.storage;
          const options = this.options;

          // 清除之前的定时器
          if (storage.debounceTimer) {
            clearTimeout(storage.debounceTimer);
          }

          // 获取光标前后文本
          const { from } = editor.state.selection;
          const doc = editor.state.doc;
          const beforeText = doc.textBetween(Math.max(0, from - options.contextWindow), from);
          const afterText = doc.textBetween(from, Math.min(doc.content.size, from + 200));

          // 检查触发条件
          if (!shouldTrigger(beforeText, options.minTriggerLength)) {
            return false;
          }

          // 设置 loading 状态
          storage.state = 'loading';
          storage.position = getCursorCoords(editor.view);
          storage.onStateChange?.(storage.state, storage.suggestions, storage.position);

          // 防抖请求
          storage.debounceTimer = setTimeout(async () => {
            try {
              const suggestions = await fetchCompletion({
                beforeText,
                afterText,
                model: options.model,
                maxSuggestions: options.maxSuggestions,
              });

              if (suggestions.length > 0) {
                storage.state = 'showing';
                storage.suggestions = suggestions;
                storage.activeIndex = 0;
                storage.position = getCursorCoords(editor.view);
              } else {
                storage.state = 'idle';
                storage.suggestions = [];
              }
            } catch (error) {
              storage.state = 'error';
              storage.suggestions = [];
            }

            storage.onStateChange?.(storage.state, storage.suggestions, storage.position);
          }, options.debounceMs);

          return true;
        },

      applyCompletion:
        (text: string) =>
        ({ editor, chain }) => {
          const storage = this.storage;

          // 获取当前光标处的 marks（格式）
          const { storedMarks, selection } = editor.state;
          const currentMarks = storedMarks || selection.$from.marks();

          // 插入补全文本
          chain().insertContent(text).run();

          // 重新应用 marks（保持格式）
          if (currentMarks.length > 0) {
            currentMarks.forEach((mark) => {
              editor.chain().setMark(mark.type.name, mark.attrs).run();
            });
          }

          // 重置状态
          storage.state = 'idle';
          storage.suggestions = [];
          storage.activeIndex = 0;
          storage.onStateChange?.(storage.state, storage.suggestions, storage.position);

          return true;
        },

      dismissCompletion:
        () =>
        ({ editor }) => {
          const storage = this.storage;

          // 清除定时器
          if (storage.debounceTimer) {
            clearTimeout(storage.debounceTimer);
            storage.debounceTimer = null;
          }

          // 重置状态
          storage.state = 'idle';
          storage.suggestions = [];
          storage.activeIndex = 0;
          storage.onStateChange?.(storage.state, storage.suggestions, storage.position);

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extensionThis = this;

    return [
      new Plugin({
        key: AiCompletionPluginKey,

        props: {
          // 处理键盘事件
          handleKeyDown(view, event) {
            const storage = extensionThis.storage;

            // 只在显示补全时处理
            if (storage.state !== 'showing' || storage.suggestions.length === 0) {
              return false;
            }

            const { suggestions, activeIndex } = storage;

            switch (event.key) {
              case 'Tab':
                // Tab: 接受当前选中的建议
                event.preventDefault();
                const selectedSuggestion = suggestions[activeIndex];
                if (selectedSuggestion) {
                  extensionThis.editor?.commands.applyCompletion(selectedSuggestion.text);
                }
                return true;

              case 'Escape':
                // ESC: 关闭补全
                event.preventDefault();
                extensionThis.editor?.commands.dismissCompletion();
                return true;

              case 'ArrowDown':
                // 下箭头：选择下一个
                event.preventDefault();
                storage.activeIndex = (activeIndex + 1) % suggestions.length;
                storage.onStateChange?.(storage.state, storage.suggestions, storage.position);
                return true;

              case 'ArrowUp':
                // 上箭头：选择上一个
                event.preventDefault();
                storage.activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
                storage.onStateChange?.(storage.state, storage.suggestions, storage.position);
                return true;

              case '1':
              case '2':
              case '3':
                // 数字键：直接选择对应建议
                const index = parseInt(event.key) - 1;
                if (index < suggestions.length) {
                  event.preventDefault();
                  extensionThis.editor?.commands.applyCompletion(suggestions[index].text);
                  return true;
                }
                return false;

              default:
                // 其他按键：关闭补全并正常输入
                extensionThis.editor?.commands.dismissCompletion();
                return false;
            }
          },
        },

        // 监听文档变化
        view() {
          return {
            update(view, prevState) {
              // 文档内容变化时，可能触发补全
              if (view.state.doc !== prevState.doc) {
                // 获取当前光标位置的文本
                const { from } = view.state.selection;
                const beforeText = view.state.doc.textBetween(Math.max(0, from - extensionThis.options.contextWindow), from);

                // 检查是否应该触发
                if (shouldTrigger(beforeText, extensionThis.options.minTriggerLength)) {
                  extensionThis.editor?.commands.triggerCompletion();
                } else if (extensionThis.storage.state !== 'idle') {
                  // 不满足条件时关闭补全
                  extensionThis.editor?.commands.dismissCompletion();
                }
              }
            },
          };
        },
      }),
    ];
  },
});

export default AiCompletion;
export type { AiCompletionOptions, CompletionSuggestion, CompletionState, PopoverPosition };
