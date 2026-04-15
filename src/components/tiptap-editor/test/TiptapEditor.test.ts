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
const {
  mockEditorGetMarkdown,
  mockEditorGetHTML,
  mockCommandSetContent,
  mockCommandFocus,
  mockCommandSetTextSelection,
  mockCommandUploadImage,
  mockCommandUploadVideo,
  mockChainSetContent,
  mockChainClearContent,
  mockChainRun,
  mockGetImageUploadPromise,
  mockPosAtCoords,
  mockEditorState,
  capturedEditorOptions,
  registerVideoMetaMock,
  registerVideoMetasMock,
  editorStoreState,
  sessionCacheGetMock,
  sessionCacheSetMock,
} = vi.hoisted(() => ({
  mockEditorGetMarkdown: vi.fn(),
  mockEditorGetHTML: vi.fn(),
  mockCommandSetContent: vi.fn(),
  mockCommandFocus: vi.fn(),
  mockCommandSetTextSelection: vi.fn(),
  mockCommandUploadImage: vi.fn(),
  mockCommandUploadVideo: vi.fn(),
  mockChainSetContent: vi.fn(),
  mockChainClearContent: vi.fn(),
  mockChainRun: vi.fn(),
  mockGetImageUploadPromise: vi.fn(),
  mockPosAtCoords: vi.fn(),
  mockEditorState: {
    selection: {
      from: 1,
      to: 1,
    },
    doc: {
      content: {
        size: 1,
      },
    },
  },
  capturedEditorOptions: {
    current: null as Record<string, any> | null,
  },
  registerVideoMetaMock: vi.fn(),
  registerVideoMetasMock: vi.fn(),
  editorStoreState: {
    videoRegistryById: {} as Record<number, { videoId: number; src: string; poster?: string | null; controls?: boolean; style?: string }>,
  },
  sessionCacheGetMock: vi.fn(),
  sessionCacheSetMock: vi.fn(),
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

const mountEditor = (props: Record<string, unknown> = {}, options: { attachTo?: HTMLElement } = {}) =>
  mount(TiptapEditor, {
    props,
    attachTo: options.attachTo,
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
    inheritAttrs: false,
    setup(_, { attrs }) {
      return () =>
        h('div', {
          ...attrs,
          'data-testid': 'editor-content-stub',
        });
    },
  });

  return {
    useEditor: vi.fn((options) => {
      capturedEditorOptions.current = options as Record<string, any>;

      return ref({
        getMarkdown: mockEditorGetMarkdown,
        getHTML: mockEditorGetHTML,
        isActive: vi.fn(() => false),
        isFocused: false,
        destroy: vi.fn(),
        state: mockEditorState,
        view: {
          posAtCoords: mockPosAtCoords,
        },
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
          focus: mockCommandFocus,
          setTextSelection: mockCommandSetTextSelection,
          applyCompletion: vi.fn(),
          uploadImage: mockCommandUploadImage,
          uploadVideo: mockCommandUploadVideo,
        },
        storage: {
          imageUpload: {
            getUploadPromise: mockGetImageUploadPromise,
          },
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

vi.mock('../TiptapToolbar.vue', () => ({
  default: defineComponent({
    props: {
      isSplitPreviewActive: {
        type: Boolean,
        default: false,
      },
      resolveImageUploadOptions: {
        type: Function,
        default: undefined,
      },
    },
    emits: ['toggle-split-preview'],
    setup(props, { emit }) {
      return () =>
        h('div', [
          h('button', { 'data-testid': 'toolbar-toggle', 'data-active': String(props.isSplitPreviewActive), onClick: () => emit('toggle-split-preview') }, 'toggle'),
          h(
            'button',
            {
              'data-testid': 'toolbar-image-upload',
              onClick: () => {
                const options = (props.resolveImageUploadOptions as undefined | (() => { onUploaded?: (payload: { url: string; imgId: number }) => void }))?.();
                options?.onUploaded?.({
                  url: 'http://example.com/from-toolbar.png',
                  imgId: 66,
                });
              },
            },
            'image-upload',
          ),
        ]);
    },
  }),
}));

vi.mock('../extensions/AiCompletion/CompletionPopover.vue', () => ({
  default: defineComponent({
    setup() {
      return () => h('div');
    },
  }),
}));

vi.mock('../config', () => ({
  getTiptapExtensions: vi.fn(() => []),
}));

vi.mock('@/utils', () => ({
  LocalCache: {
    getCache: vi.fn(() => null),
  },
  SessionCache: {
    getCache: sessionCacheGetMock,
    setCache: sessionCacheSetMock,
  },
  isEmptyObj: vi.fn((value: Record<string, unknown>) => Object.keys(value ?? {}).length > 0),
  annotateLegacyVideoIdsInHtml: vi.fn((html: string) => html),
  emitter: {
    on: vi.fn(),
    off: vi.fn(),
  },
  Msg: {
    showFail: vi.fn(),
    showWarn: vi.fn(),
  },
}));

vi.mock('@/stores/editor.store', () => ({
  default: () => ({
    videoRegistryById: editorStoreState.videoRegistryById,
    registerVideoMeta: registerVideoMetaMock,
    registerVideoMetas: registerVideoMetasMock,
  }),
  getVideoMetaById: (videoId: number) => editorStoreState.videoRegistryById[videoId],
}));

// =================================================================================
// 5. 导入被测组件（必须放在所有 vi.mock 之后）
// =================================================================================
// vi.mock 会被自动提升到文件顶部，所以这里的 import 实际拿到的已经是 mock 过的依赖。
// 如果把这行放到 vi.mock 之前，在某些场景下 mock 可能还没生效，导致组件用到真实依赖。
// =================================================================================
import TiptapEditor from '../TiptapEditor.vue';

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
    mockCommandFocus.mockReset();
    mockCommandSetTextSelection.mockReset();
    mockCommandUploadImage.mockReset();
    mockCommandUploadVideo.mockReset();
    mockChainSetContent.mockReset();
    mockChainClearContent.mockReset();
    mockChainRun.mockReset();
    mockGetImageUploadPromise.mockReset();
    mockPosAtCoords.mockReset();
    registerVideoMetaMock.mockReset();
    registerVideoMetasMock.mockReset();
    sessionCacheGetMock.mockReset();
    sessionCacheSetMock.mockReset();
    Object.keys(editorStoreState.videoRegistryById).forEach((key) => {
      delete editorStoreState.videoRegistryById[Number(key)];
    });

    mockEditorGetMarkdown.mockReturnValue('# 初始标题\n\n预览内容');
    mockEditorGetHTML.mockReturnValue('<h1>初始标题</h1><p>预览内容</p>');
    mockChainSetContent.mockReturnValue({ run: mockChainRun });
    mockChainClearContent.mockReturnValue({ run: mockChainRun });
    mockGetImageUploadPromise.mockResolvedValue(undefined);
    mockPosAtCoords.mockReturnValue(null);
    sessionCacheGetMock.mockReturnValue(undefined);
    capturedEditorOptions.current = null;
    mockEditorState.selection.from = 1;
    mockEditorState.selection.to = 1;
    mockEditorState.doc.content.size = 24;

    registerVideoMetaMock.mockImplementation((meta: { videoId: number }) => {
      editorStoreState.videoRegistryById[meta.videoId] = meta as never;
    });
    registerVideoMetasMock.mockImplementation((metas: Array<{ videoId: number }>) => {
      metas.forEach((meta) => {
        editorStoreState.videoRegistryById[meta.videoId] = meta as never;
      });
    });
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

  it('restores the split preview state from SessionCache when the last session left preview closed', async () => {
    sessionCacheGetMock.mockReturnValue(false);

    const wrapper = mountEditor();

    await flushPromises();

    expect(wrapper.get('[data-testid="toolbar-toggle"]').attributes('data-active')).toBe('false');
    expect(wrapper.find('[data-testid="editor-content-stub"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="markdown-split-preview"]').attributes('style')).toContain('display: none;');
  });

  it('emits ready once the tiptap editor instance is available', async () => {
    const wrapper = mountEditor();

    await flushPromises();

    expect(wrapper.emitted('ready')).toHaveLength(1);
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

  it('inserts uploaded image html with stable imageId at the current source cursor while split preview is active', async () => {
    mockEditorGetMarkdown.mockReturnValue('123\n321');
    mockEditorGetHTML.mockReturnValue('<p>123</p><p>321</p>');

    const wrapper = mountEditor();

    await flushPromises();

    const sourceInput = wrapper.get('[data-testid="markdown-source-input"]');
    const textarea = sourceInput.element as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(2, 2);

    await sourceInput.trigger('focus');
    await sourceInput.trigger('select');
    await wrapper.get('[data-testid="toolbar-image-upload"]').trigger('click');
    await flushPromises();

    expect((wrapper.get('[data-testid="markdown-source-input"]').element as HTMLTextAreaElement).value).toBe(
      '12<img data-image-id="66" src="http://example.com/from-toolbar.png" alt="" />3\n321',
    );
    expect(mockCommandSetContent).toHaveBeenLastCalledWith(
      '12<img data-image-id="66" src="http://example.com/from-toolbar.png" alt="" />3\n321',
      expect.objectContaining({
        contentType: 'markdown',
      }),
    );
  });

  it('focuses the markdown source at the end when setSelectionToEnd is called while split preview is visible', async () => {
    mockEditorGetMarkdown.mockReturnValue('123\n321');
    mockEditorGetHTML.mockReturnValue('<p>123</p><p>321</p>');

    const wrapper = mountEditor({}, { attachTo: document.body });

    await flushPromises();

    await (wrapper.vm as unknown as { setSelectionToEnd: () => void }).setSelectionToEnd();
    await flushPromises();

    const sourceInput = wrapper.get('[data-testid="markdown-source-input"]').element as HTMLTextAreaElement;

    expect(document.activeElement).toBe(sourceInput);
    expect(sourceInput.selectionStart).toBe(sourceInput.value.length);
    expect(sourceInput.selectionEnd).toBe(sourceInput.value.length);

    wrapper.unmount();
  });

  it('focuses the rich-text editor end when setSelectionToEnd is called while split preview is closed', async () => {
    sessionCacheGetMock.mockReturnValue(false);

    const wrapper = mountEditor();

    await flushPromises();

    await (wrapper.vm as unknown as { setSelectionToEnd: () => void }).setSelectionToEnd();
    await flushPromises();

    expect(mockCommandFocus).toHaveBeenCalledWith('end');
  });

  it('keeps split preview content in sync when parent restores json without emitting update', async () => {
    mockEditorGetMarkdown.mockReturnValue('');
    mockEditorGetHTML.mockReturnValue('<p></p>');

    const wrapper = mountEditor();

    await flushPromises();

    mockEditorGetMarkdown.mockReturnValue('## 恢复后的标题');
    mockEditorGetHTML.mockReturnValue('<h2>恢复后的标题</h2>');

    await (wrapper.vm as unknown as { setContent: (content: Record<string, unknown>, emitUpdate?: boolean) => void }).setContent(
      {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '恢复后的标题' }],
          },
        ],
      },
      false,
    );
    await flushPromises();

    expect((wrapper.get('[data-testid="markdown-source-input"]').element as HTMLTextAreaElement).value).toContain('恢复后的标题');
  });

  it('shows stable video tokens in the source panel while rendering real videos in preview', async () => {
    editorStoreState.videoRegistryById[123] = {
      videoId: 123,
      src: 'http://example.com/demo.mp4',
      poster: 'http://example.com/demo.jpg',
      controls: true,
      style: 'width: 360px; max-width: 100%; height: auto;',
    };
    mockEditorGetMarkdown.mockReturnValue(
      '[[video:123]]\n\n继续输入普通文字',
    );
    mockEditorGetHTML.mockReturnValue(
      '<video data-video-id="123" src="http://example.com/demo.mp4" poster="http://example.com/demo.jpg" controls="" style="width: 360px; max-width: 100%; height: auto;"></video><p>继续输入普通文字</p>',
    );

    const wrapper = mountEditor();

    await flushPromises();

    expect((wrapper.get('[data-testid="markdown-source-input"]').element as HTMLTextAreaElement).value).toContain('[[video:123]]');
    expect(wrapper.get('[data-testid="markdown-preview-panel"] video').attributes('src')).toBe('http://example.com/demo.mp4');
    expect(wrapper.get('[data-testid="markdown-preview-panel"] video').attributes('data-video-id')).toBe('123');
  });

  it('hydrates existing article video metadata into the preview even when runtime registry starts empty', async () => {
    mockEditorGetMarkdown.mockReturnValue('[[video:428]]');
    mockEditorGetHTML.mockReturnValue('<p>[[video:428]]</p>');

    const wrapper = mountEditor({
      editData: {
        videos: [
          {
            id: 428,
            url: 'http://example.com/existing.mp4',
          },
        ],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="markdown-preview-panel"] video').attributes('src')).toBe('http://example.com/existing.mp4');
    expect(wrapper.get('[data-testid="markdown-preview-panel"] video').attributes('data-video-id')).toBe('428');
    expect(wrapper.get('[data-testid="markdown-preview-panel"]').text()).not.toContain('未解析视频 428');
  });

  it('shows an explicit placeholder when a video token cannot be resolved', async () => {
    mockEditorGetMarkdown.mockReturnValue('[[video:404]]');
    mockEditorGetHTML.mockReturnValue('<p>[[video:404]]</p>');

    const wrapper = mountEditor();

    await flushPromises();

    expect(wrapper.get('[data-testid="markdown-preview-panel"]').text()).toContain('未解析视频 404');
  });

  it('rerenders the split preview when video registry metadata arrives later without changing the markdown text', async () => {
    mockEditorGetMarkdown.mockReturnValue('[[video:428]]');
    mockEditorGetHTML.mockReturnValue('<p>[[video:428]]</p>');

    const wrapper = mountEditor();

    await flushPromises();

    expect(wrapper.get('[data-testid="markdown-preview-panel"]').text()).toContain('未解析视频 428');

    capturedEditorOptions.current?.onUpdate?.({
      editor: {
        getHTML: () => '<p>[[video:428]]</p>',
        getMarkdown: () => '[[video:428]]',
        getJSON: () => ({
          type: 'doc',
          content: [
            {
              type: 'video',
              attrs: {
                videoId: 428,
                src: 'http://example.com/later.mp4',
                poster: null,
                controls: true,
                style: 'width: 360px; max-width: 100%; height: auto;',
              },
            },
          ],
        }),
      },
    });
    await flushPromises();

    expect(wrapper.get('[data-testid="markdown-preview-panel"] video').attributes('src')).toBe('http://example.com/later.mp4');
    expect(wrapper.get('[data-testid="markdown-preview-panel"]').text()).not.toContain('未解析视频 428');
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

  it('persists split preview preference to SessionCache whenever the toggle changes', async () => {
    const wrapper = mountEditor();

    await flushPromises();
    await wrapper.get('[data-testid="toolbar-toggle"]').trigger('click');

    expect(sessionCacheSetMock).toHaveBeenCalledWith('tiptap-editor-split-preview-active', false);
  });

  it('uploads dropped images at the resolved drop position instead of always appending to the end', async () => {
    mockPosAtCoords.mockReturnValue({ pos: 17 });

    const wrapper = mountEditor();
    const file = new File(['demo'], 'drop.jpg', { type: 'image/jpeg' });

    await flushPromises();
    await wrapper.get('[data-testid="editor-content-stub"]').trigger('drop', {
      clientX: 120,
      clientY: 240,
      dataTransfer: {
        files: [file],
        types: ['Files'],
      },
    });
    await flushPromises();

    expect(mockCommandUploadImage).toHaveBeenCalledWith(file, {
      insertSelection: {
        from: 17,
        to: 17,
      },
    });
  });

  it('shows drag upload highlight only for external file drags, not when reordering existing editor nodes', async () => {
    const wrapper = mountEditor();
    const editorContent = wrapper.get('[data-testid="editor-content-stub"]');

    await flushPromises();
    await editorContent.trigger('dragenter', {
      dataTransfer: {
        types: ['text/plain'],
      },
    });

    expect(wrapper.get('[data-testid="editor-content-stub"]').classes()).not.toContain('is-dragging');

    await editorContent.trigger('dragenter', {
      dataTransfer: {
        types: ['Files'],
      },
    });

    expect(wrapper.get('[data-testid="editor-content-stub"]').classes()).toContain('is-dragging');
  });

  it('shows drag upload highlight in split preview mode for external file drags too', async () => {
    const wrapper = mountEditor();
    const splitPreview = wrapper.get('[data-testid="markdown-split-preview"]');

    await flushPromises();
    await splitPreview.trigger('dragenter', {
      dataTransfer: {
        types: ['Files'],
      },
    });

    expect(wrapper.get('[data-testid="markdown-split-preview"]').classes()).toContain('is-dragging');
  });

  // 用例 ④：验证编辑器 onUpdate 触发时始终向父组件 emit HTML 内容（保证提交链路不变）
  it('keeps emitting html content to the parent on editor updates', async () => {
    const wrapper = mountEditor();

    await flushPromises();

    capturedEditorOptions.current?.onUpdate?.({
      editor: {
        getHTML: () => '<p>保持 HTML 回传</p>',
        getMarkdown: () => '保持 HTML 回传',
        getJSON: () => ({
          type: 'doc',
          content: [{ type: 'paragraph' }],
        }),
      },
    });

    expect(wrapper.emitted('update:content')?.at(-1)?.[0]).toBe('<p>保持 HTML 回传</p>');
    expect(wrapper.emitted('update:json-content')?.at(-1)?.[0]).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  });

  it('hydrates video registry metadata from editor json updates so token previews stay resolved', async () => {
    const wrapper = mountEditor();

    await flushPromises();

    capturedEditorOptions.current?.onUpdate?.({
      editor: {
        getHTML: () =>
          '<video data-video-id="123" src="http://example.com/demo.mp4" poster="http://example.com/demo.jpg" controls="" style="width: 360px; max-width: 100%; height: auto;"></video><p>继续输入普通文字</p>',
        getMarkdown: () => '[[video:123]]\n\n继续输入普通文字',
        getJSON: () => ({
          type: 'doc',
          content: [
            {
              type: 'video',
              attrs: {
                videoId: 123,
                src: 'http://example.com/demo.mp4',
                poster: 'http://example.com/demo.jpg',
                controls: true,
                style: 'width: 360px; max-width: 100%; height: auto;',
              },
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '继续输入普通文字' }],
            },
          ],
        }),
      },
    });
    await flushPromises();

    expect(registerVideoMetasMock).toHaveBeenCalledWith([
      {
        videoId: 123,
        src: 'http://example.com/demo.mp4',
        poster: 'http://example.com/demo.jpg',
        controls: true,
        style: 'width: 360px; max-width: 100%; height: auto;',
      },
    ]);
    expect((wrapper.get('[data-testid="markdown-source-input"]').element as HTMLTextAreaElement).value).toContain('[[video:123]]');
    expect(wrapper.get('[data-testid="markdown-preview-panel"] video').attributes('data-video-id')).toBe('123');
  });
});
