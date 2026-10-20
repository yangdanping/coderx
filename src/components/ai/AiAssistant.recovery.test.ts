import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AiAssistant from './AiAssistant.vue';

// Keep the real Chat/DefaultChatTransport: SDK failures resolve with error state,
// so a mock that simply rejects sendMessage would miss the regression.
const fetchMock = vi.fn<typeof fetch>();
const selections = [{ id: 'selection-a', text: '需要解释的原文' }];
const wrappers: VueWrapper[] = [];
const healthy = () => Response.json({ status: 'online', models: [{ name: 'Test', value: 'test' }], capability: { type: 'assistant', supportsTools: false } });
const stream = (chunks: object[]) =>
  new Response(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n', {
    headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
  });
const answer = () =>
  stream([
    { type: 'start', messageId: 'reply' },
    { type: 'text-start', id: 'text' },
    { type: 'text-delta', id: 'text', delta: '恢复后的回答' },
    { type: 'text-end', id: 'text' },
    { type: 'finish', finishReason: 'stop' },
  ]);
const chatCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/ai/chat'));
const button = (wrapper: VueWrapper, text: string) => wrapper.findAll('button').find((item) => item.text() === text)!;

async function mountAssistant() {
  const wrapper = mount(AiAssistant, {
    props: { selectionContexts: selections, conversationScope: 'article:42' },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, initialState: { user: { token: '', userInfo: {} } } })],
      directives: {
        dompurifyHtml: (el, binding) => {
          el.textContent = binding.value;
        },
      },
      stubs: {
        ElInput: {
          props: ['modelValue', 'disabled'],
          emits: ['update:modelValue'],
          template: '<textarea :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        ElButton: { props: ['disabled', 'loading'], template: '<button type="button" :disabled="disabled || loading"><slot /></button>' },
        ElTooltip: { template: '<div><slot /></div>' },
        ElIcon: { template: '<span><slot /></span>' },
        ElAvatar: true,
        ElSelect: true,
        ElOption: true,
        ThinkingShimmer: true,
        ThinkingWave: true,
      },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  await wrapper.get('.ai-trigger').trigger('click');
  await flushPromises();
  return wrapper;
}

async function send(wrapper: VueWrapper, text = '请解释这段内容') {
  await wrapper.get('textarea').setValue(text);
  await wrapper.get('form').trigger('submit');
  await flushPromises();
}

describe('AI assistant failure recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url) => (String(url).endsWith('/ai/health') ? healthy() : answer()));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('allows drafting offline and recovers through a manual health check', async () => {
    fetchMock.mockImplementation(async () => Response.json({ status: 'offline', models: [] }));
    const wrapper = await mountAssistant();
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined();
    await wrapper.get('textarea').setValue('保留草稿');
    expect(button(wrapper, '发送').attributes('disabled')).toBeDefined();
    fetchMock.mockResolvedValue(healthy());
    await button(wrapper, '重新检查').trigger('click');
    await flushPromises();
    expect(button(wrapper, '发送').attributes('disabled')).toBeUndefined();
    expect(wrapper.get('textarea').element.value).toBe('保留草稿');
    expect(chatCalls()).toHaveLength(0);
  });

  it('rechecks an offline service when reopening the assistant', async () => {
    fetchMock.mockImplementation(async () => Response.json({ status: 'offline', models: [] }));
    const wrapper = await mountAssistant();
    await wrapper.get('.ai-trigger').trigger('click');
    fetchMock.mockResolvedValue(healthy());
    await wrapper.get('.ai-trigger').trigger('click');
    await flushPromises();
    await wrapper.get('textarea').setValue('重试');
    expect(button(wrapper, '发送').attributes('disabled')).toBeUndefined();
  });

  it('restores SDK HTTP failures and retries the same user message without duplicates', async () => {
    const wrapper = await mountAssistant();
    fetchMock.mockResolvedValueOnce(Response.json({ message: '请求太频繁，请稍后重试' }, { status: 429 }));
    await send(wrapper);
    expect(wrapper.get('textarea').element.value).toBe('请解释这段内容');
    expect(wrapper.get('[role="alert"]').text()).toContain('请求太频繁，请稍后重试');
    expect(wrapper.emitted('clear:selection-contexts')).toBeUndefined();
    expect(wrapper.findAll('.message.user')).toHaveLength(1);
    await send(wrapper, '修改后再试');
    const payload = JSON.parse(String(chatCalls()[1]![1]!.body));
    expect(payload.messages).toHaveLength(1);
    expect(payload.messages[0].parts[0].text).toBe('修改后再试');
    expect(payload.selectionContexts).toEqual(selections);
    expect(wrapper.findAll('.message.user')).toHaveLength(1);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('恢复后的回答');
    expect(wrapper.emitted('clear:selection-contexts')).toHaveLength(1);
  });

  it('retains a partial reply on stream failure and replaces it on retry', async () => {
    const wrapper = await mountAssistant();
    fetchMock.mockResolvedValueOnce(
      stream([
        { type: 'start', messageId: 'partial' },
        { type: 'text-start', id: 'text' },
        { type: 'text-delta', id: 'text', delta: '未完成的回答' },
        { type: 'error', errorText: '连接中断' },
      ]),
    );
    await send(wrapper);
    expect(wrapper.get('textarea').element.value).toBe('请解释这段内容');
    expect(wrapper.text()).toContain('未完成的回答');
    expect(wrapper.get('[role="alert"]').text()).toContain('连接中断');
    await button(wrapper, '发送').trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('未完成的回答');
    expect(wrapper.text()).toContain('恢复后的回答');
    expect(wrapper.findAll('.message.user')).toHaveLength(1);
  });

  it.each([false, true])('keeps the question when a stream ends without a finish event (text ended: %s)', async (textEnded) => {
    const wrapper = await mountAssistant();
    fetchMock.mockResolvedValueOnce(
      stream([
        { type: 'start', messageId: 'truncated' },
        { type: 'text-start', id: 'text' },
        { type: 'text-delta', id: 'text', delta: '连接断开前的回答' },
        ...(textEnded ? [{ type: 'text-end', id: 'text' }] : []),
      ]),
    );
    await send(wrapper);

    expect(wrapper.get('textarea').element.value).toBe('请解释这段内容');
    expect(wrapper.text()).toContain('连接断开前的回答');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.emitted('clear:selection-contexts')).toBeUndefined();

    await send(wrapper, '截断后重试');
    const payload = JSON.parse(String(chatCalls()[1]![1]!.body));
    expect(payload.messages).toHaveLength(1);
    expect(payload.messages[0].parts[0].text).toBe('截断后重试');
    expect(wrapper.text()).not.toContain('连接断开前的回答');
    expect(wrapper.text()).toContain('恢复后的回答');
  });

  it('accepts a complete stream whose finish event omits the optional reason', async () => {
    const wrapper = await mountAssistant();
    fetchMock.mockResolvedValueOnce(
      stream([
        { type: 'start', messageId: 'complete' },
        { type: 'text-start', id: 'text' },
        { type: 'text-delta', id: 'text', delta: '完整回答' },
        { type: 'text-end', id: 'text' },
        { type: 'finish' },
      ]),
    );
    await send(wrapper);

    expect(wrapper.get('textarea').element.value).toBe('');
    expect(wrapper.text()).toContain('完整回答');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.emitted('clear:selection-contexts')).toHaveLength(1);
  });

  it('preserves input and contexts after a network failure', async () => {
    const wrapper = await mountAssistant();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await send(wrapper);
    expect(wrapper.get('textarea').element.value).toBe('请解释这段内容');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(button(wrapper, '发送').attributes('disabled')).toBeUndefined();
    expect(wrapper.emitted('clear:selection-contexts')).toBeUndefined();
  });

  it('stopping before a reply keeps the question and contexts without a failure alert', async () => {
    const wrapper = await mountAssistant();
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    await send(wrapper);
    await button(wrapper, '停止').trigger('click');
    await flushPromises();
    expect(wrapper.get('textarea').element.value).toBe('请解释这段内容');
    expect(wrapper.emitted('clear:selection-contexts')).toBeUndefined();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('ignores an old failed request after switching conversation', async () => {
    const wrapper = await mountAssistant();
    let rejectRequest!: (error: Error) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );
    await send(wrapper);
    await wrapper.setProps({ conversationScope: 'article:99', selectionContexts: [{ id: 'new', text: '新文章' }] });
    rejectRequest(new Error('旧请求失败'));
    await flushPromises();
    expect(wrapper.get('textarea').element.value).toBe('');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.emitted('clear:selection-contexts')).toBeUndefined();
    expect(wrapper.findAll('.message')).toHaveLength(0);
  });

  it('prevents rapid double submission and preserves contexts added during a response', async () => {
    const wrapper = await mountAssistant();
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await send(wrapper);
    await wrapper.get('form').trigger('submit');
    await wrapper.setProps({ selectionContexts: [...selections, { id: 'next', text: '下次提问的内容' }] });
    resolve(answer());
    await flushPromises();
    expect(chatCalls()).toHaveLength(1);
    expect(wrapper.emitted('clear:selection-contexts')).toBeUndefined();
    expect(wrapper.emitted('remove:selection-context')).toEqual([['selection-a']]);
    expect(JSON.parse(String(chatCalls()[0]![1]!.body)).selectionContexts).toEqual(selections);
  });

  it('stopping during a partial answer preserves it until the question is sent again', async () => {
    const wrapper = await mountAssistant();
    const encoder = new TextEncoder();
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    fetchMock.mockImplementationOnce((_url, init) => {
      const body = new ReadableStream<Uint8Array>({
        start(streamController) {
          controller = streamController;
        },
      });
      init?.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
      return Promise.resolve(new Response(body, { headers: { 'content-type': 'text/event-stream' } }));
    });
    await send(wrapper);
    for (const chunk of [
      { type: 'start', messageId: 'partial' },
      { type: 'text-start', id: 'text' },
      { type: 'text-delta', id: 'text', delta: '保留部分回答' },
    ]) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    }
    await flushPromises();
    await button(wrapper, '停止').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('保留部分回答');
    expect(wrapper.get('textarea').element.value).toBe('请解释这段内容');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    await button(wrapper, '发送').trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('保留部分回答');
    expect(wrapper.text()).toContain('恢复后的回答');
    expect(wrapper.findAll('.message.user')).toHaveLength(1);
  });
});
