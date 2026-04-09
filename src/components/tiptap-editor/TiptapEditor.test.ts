// =================================================================================
// 为什么需要这个测试文件？—— Vitest 在项目中的角色
// =================================================================================
//
// 【什么是 Vitest？】
//   Vitest 是专为 Vite 项目设计的单元/组件测试框架，可以理解为"跑在 Vite 上的 Jest"。
//   它直接复用 vite.config.ts 的别名(@/xxx)、插件(.vue 文件解析)等配置，零额外配置就能跑。
//
// 【Vitest 在这里扮演什么角色？】
//   这个文件测的是"Markdown 分栏实时预览"功能（对应 18_Markdown分栏实时预览实现与踩坑总结.md）。
//   Vitest 在这里做的事情是：
//     1. 在 Node.js 环境中模拟浏览器 DOM，把 TiptapEditor.vue 组件挂载出来
//     2. 用假的（mock）编辑器替代真实的 Tiptap 编辑器（因为 ProseMirror 依赖真实 DOM，在 Node 里跑不动）
//     3. 模拟用户操作（输入文字、点按钮），然后断言组件的输出是否符合预期
//
// 【收益是什么？】
//   - 防回归：以后改代码时，如果不小心破坏了"分栏预览默认展示""编辑同步""模式切换"等行为，
//     跑一次测试就能立刻发现，不需要手动打开浏览器逐个点一遍
//   - 文档化：测试用例本身就是"这个组件应该怎么工作"的活文档
//   - 信心：重构时心里有底，改完跑测试全绿就说明没搞坏东西
//
// 【什么阶段写？】
//   通常是功能开发完成、手动验证通过后，把关键行为固化成自动化测试。
//   属于"完成功能的最后一步"，也是以后维护的第一道防线。
//
// 【功能完成后能删掉吗？】
//   不建议删除。测试文件的价值恰恰在功能完成之后——它持续守护代码不被后续修改破坏。
//   只有当被测组件本身被删除或彻底重写时，才需要同步删除或重写测试。
// =================================================================================

import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// =================================================================================
// 1. 提升 mock 函数声明（vi.hoisted）
// =================================================================================
// 为什么需要 vi.hoisted？
//   vi.mock 会被 Vitest 自动提升到文件最顶部执行（早于所有 import），
//   但普通的 const 变量不会被提升，导致 vi.mock 内部引用不到这些变量。
//   vi.hoisted 就是告诉 Vitest："把这段代码也一起提升到最顶部"，
//   这样 mock 函数和 vi.mock 块就能在同一时机初始化，互相引用不会报错。
//
// 这些 mock 函数模拟了 Tiptap Editor 的核心 API：
//   - mockEditorGetMarkdown / mockEditorGetHTML → 模拟获取编辑器内容
//   - mockCommandSetContent                    → 模拟 editor.commands.setContent()
//   - mockChainSetContent / mockChainClearContent / mockChainRun → 模拟链式调用 editor.chain().xxx().run()
//   - capturedEditorOptions → 捕获 useEditor 的配置参数，方便测试中手动触发 onUpdate 回调
// =================================================================================
const { mockEditorGetMarkdown, mockEditorGetHTML, mockCommandSetContent, mockChainSetContent, mockChainClearContent, mockChainRun, capturedEditorOptions } = vi.hoisted(() => ({
  mockEditorGetMarkdown: vi.fn(),
  mockEditorGetHTML: vi.fn(),
  mockCommandSetContent: vi.fn(),
  mockChainSetContent: vi.fn(),
  mockChainClearContent: vi.fn(),
  mockChainRun: vi.fn(),
  capturedEditorOptions: {
    current: null as Record<string, any> | null,
  },
}));

// =================================================================================
// 2. 组件桩（Stub）与挂载辅助函数
// =================================================================================
// 测试只关心 TiptapEditor 本身的逻辑，不关心 Element Plus 按钮、v-dompurify-html 指令
// 这些外部东西的真实渲染。所以用最简单的替身（stub）把它们替换掉：
//   - elementButtonStub   → 把 <el-button> 替换成普通 <button>，保留插槽内容
//   - v-dompurify-html 指令 → 简单地把值赋给 innerHTML（真实指令会做 XSS 过滤，测试里不需要）
//
// mountEditor() 是每个测试用例的入口，统一配置好这些 stub 后挂载组件。
// =================================================================================
const elementButtonStub = defineComponent({
  setup(_, { slots }) {
    return () => h('button', slots.default?.());
  },
});

const mountEditor = () =>
  mount(TiptapEditor, {
    global: {
      directives: {
        'dompurify-html': (el, binding) => {
          el.innerHTML = binding.value;
        },
      },
      stubs: {
        ElButton: elementButtonStub,
      },
    },
  });

// =================================================================================
// 3. Mock 外部依赖——Tiptap 编辑器核心（@tiptap/vue-3）
// =================================================================================
// 这是整个测试文件最关键的 mock。为什么不用真实 Tiptap？
//   - ProseMirror（Tiptap 底层）需要完整的浏览器 DOM 环境（contenteditable、Selection API 等），
//     在 Node.js + jsdom/happy-dom 里跑不完整，强行跑会报各种底层错误
//   - 我们测的是 TiptapEditor.vue 的业务逻辑（分栏预览、内容同步），不是 Tiptap 本身
//
// 所以这里手动构造了一个"假编辑器"，它拥有和真实编辑器一样的 API 签名：
//   - useEditor() → 返回 ref 包裹的编辑器对象
//   - EditorContent → 替换为简单 div
//   - 编辑器对象上有 getMarkdown / getHTML / chain / commands 等方法
//   - capturedEditorOptions 捕获了传给 useEditor 的 options，测试中可以手动调用 onUpdate
// =================================================================================
vi.mock('@tiptap/vue-3', () => {
  const EditorContent = defineComponent({
    setup() {
      return () => h('div', { 'data-testid': 'editor-content-stub' });
    },
  });

  return {
    useEditor: vi.fn((options) => {
      capturedEditorOptions.current = options as Record<string, any>;

      return ref({
        getMarkdown: mockEditorGetMarkdown,
        getHTML: mockEditorGetHTML,
        isActive: vi.fn(() => false),
        destroy: vi.fn(),
        chain: () => ({
          setContent: mockChainSetContent,
          clearContent: mockChainClearContent,
          focus: () => ({
            toggleBold: () => ({ run: mockChainRun }),
            toggleItalic: () => ({ run: mockChainRun }),
            extendMarkRange: () => ({
              unsetLink: () => ({ run: mockChainRun }),
              setLink: () => ({ run: mockChainRun }),
            }),
            updateAttributes: vi.fn(),
            run: mockChainRun,
          }),
          run: mockChainRun,
        }),
        commands: {
          setContent: mockCommandSetContent,
          applyCompletion: vi.fn(),
          uploadImage: vi.fn(),
          uploadVideo: vi.fn(),
        },
        storage: {
          aiCompletion: {
            activeIndex: 0,
            onStateChange: undefined,
          },
        },
      });
    }),
    EditorContent,
  };
});

// =================================================================================
// 4. Mock 其余外部依赖——BubbleMenu、子组件、工具函数
// =================================================================================
// 原理和上面一样：把不需要真实运行的外部模块替换成最简桩件，
// 让测试只聚焦于 TiptapEditor.vue 自身的分栏预览逻辑。
//
//   - BubbleMenu      → 替换为透传插槽的 div（划词工具栏，这里不测它的显示逻辑）
//   - TiptapToolbar    → 替换为带 data-testid 的按钮，接收 isSplitPreviewActive prop 并能触发事件
//   - CompletionPopover → 替换为空 div（AI 补全弹窗，这里不测）
//   - config           → getTiptapExtensions 返回空数组（不需要真实扩展）
//   - @/utils          → LocalCache / emitter / Msg 全部替换为空操作
// =================================================================================
vi.mock('@tiptap/vue-3/menus', () => ({
  BubbleMenu: defineComponent({
    setup(_, { slots }) {
      return () => h('div', slots.default?.());
    },
  }),
}));

vi.mock('./TiptapToolbar.vue', () => ({
  default: defineComponent({
    props: {
      isSplitPreviewActive: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['toggle-split-preview'],
    setup(props, { emit }) {
      return () => h('button', { 'data-testid': 'toolbar-toggle', 'data-active': String(props.isSplitPreviewActive), onClick: () => emit('toggle-split-preview') }, 'toggle');
    },
  }),
}));

vi.mock('./extensions/AiCompletion/CompletionPopover.vue', () => ({
  default: defineComponent({
    setup() {
      return () => h('div');
    },
  }),
}));

vi.mock('./config', () => ({
  getTiptapExtensions: vi.fn(() => []),
}));

vi.mock('@/utils', () => ({
  LocalCache: {
    getCache: vi.fn(() => null),
  },
  isEmptyObj: vi.fn((value: Record<string, unknown>) => Object.keys(value ?? {}).length > 0),
  emitter: {
    on: vi.fn(),
    off: vi.fn(),
  },
  Msg: {
    showFail: vi.fn(),
    showWarn: vi.fn(),
  },
}));

// =================================================================================
// 5. 导入被测组件（必须放在所有 vi.mock 之后）
// =================================================================================
// vi.mock 会被自动提升到文件顶部，所以这里的 import 实际拿到的已经是 mock 过的依赖。
// 如果把这行放到 vi.mock 之前，在某些场景下 mock 可能还没生效，导致组件用到真实依赖。
// =================================================================================
import TiptapEditor from './TiptapEditor.vue';

// =================================================================================
// 6. 测试用例——验证"Markdown 分栏实时预览"的核心行为
// =================================================================================
// 这四个用例分别覆盖了功能文档（18_Markdown分栏实时预览实现与踩坑总结.md）中的关键需求：
//   ① 默认进入分栏预览，左侧 textarea 显示编辑器的 Markdown 内容
//   ② 左侧编辑 Markdown 后，内容同步回 Tiptap 编辑器（contentType: 'markdown'）
//   ③ 点击 toolbar 切换按钮可以在"分栏预览"与"富文本编辑"之间来回切换
//   ④ 无论在哪个模式下，编辑器内容变化时始终向父组件发送 HTML（保证提交链路不受影响）
// =================================================================================
describe('TiptapEditor', () => {
  // =================================================================================
  // 6.1 beforeEach——每个测试用例执行前的清理和初始化
  // =================================================================================
  // 为什么每次都要 reset？
  //   mock 函数会记住"被调用过几次、参数是什么"等信息。如果不清理，
  //   上一个用例的调用记录会污染下一个用例的断言，导致误判。
  //
  // mockReturnValue 设置了"假编辑器"在被调用时返回的默认内容，
  // 这样每个测试用例都从同一个已知状态开始，互不干扰。
  // =================================================================================
  beforeEach(() => {
    mockEditorGetMarkdown.mockReset();
    mockEditorGetHTML.mockReset();
    mockCommandSetContent.mockReset();
    mockChainSetContent.mockReset();
    mockChainClearContent.mockReset();
    mockChainRun.mockReset();

    mockEditorGetMarkdown.mockReturnValue('# 初始标题\n\n预览内容');
    mockEditorGetHTML.mockReturnValue('<h1>初始标题</h1><p>预览内容</p>');
    mockChainSetContent.mockReturnValue({ run: mockChainRun });
    mockChainClearContent.mockReturnValue({ run: mockChainRun });
    capturedEditorOptions.current = null;
  });

  // 用例 ①：验证默认展示分栏预览，且左侧 textarea 从编辑器获取 Markdown 内容
  it('shows markdown split preview by default and seeds the source panel from editor markdown', async () => {
    const wrapper = mountEditor();

    await flushPromises();

    const sourceInput = wrapper.get('[data-testid="markdown-source-input"]');

    expect((sourceInput.element as HTMLTextAreaElement).value).toContain('# 初始标题');
    expect(wrapper.find('[data-testid="markdown-preview-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="split-preview-divider"]').exists()).toBe(true);
  });

  // 用例 ②：验证左侧 Markdown 编辑后会同步回 Tiptap 编辑器（contentType 必须是 'markdown'）
  it('syncs markdown edits back to the editor with markdown content type', async () => {
    const wrapper = mountEditor();

    await flushPromises();

    const sourceInput = wrapper.get('[data-testid="markdown-source-input"]');
    await sourceInput.setValue('## 更新后的标题');

    expect(mockCommandSetContent).toHaveBeenCalledWith(
      '## 更新后的标题',
      expect.objectContaining({
        contentType: 'markdown',
      }),
    );
  });

  // 用例 ③：验证 toolbar 切换按钮能在"分栏预览"和"富文本编辑"之间来回切换
  it('switches between split preview and editor view from the toolbar toggle without losing the split view on return', async () => {
    const wrapper = mountEditor();

    await flushPromises();

    expect(wrapper.get('[data-testid="toolbar-toggle"]').attributes('data-active')).toBe('true');

    await wrapper.get('[data-testid="toolbar-toggle"]').trigger('click');

    expect(wrapper.get('[data-testid="toolbar-toggle"]').attributes('data-active')).toBe('false');
    expect(wrapper.find('[data-testid="editor-content-stub"]').exists()).toBe(true);

    await wrapper.get('[data-testid="toolbar-toggle"]').trigger('click');

    expect(wrapper.get('[data-testid="toolbar-toggle"]').attributes('data-active')).toBe('true');
    expect(wrapper.find('[data-testid="markdown-preview-panel"]').exists()).toBe(true);
  });

  // 用例 ④：验证编辑器 onUpdate 触发时始终向父组件 emit HTML 内容（保证提交链路不变）
  it('keeps emitting html content to the parent on editor updates', async () => {
    const wrapper = mountEditor();

    await flushPromises();

    capturedEditorOptions.current?.onUpdate?.({
      editor: {
        getHTML: () => '<p>保持 HTML 回传</p>',
        getMarkdown: () => '保持 HTML 回传',
      },
    });

    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toBe('<p>保持 HTML 回传</p>');
  });
});
