import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalBackground3D from '../GlobalBackground3D.vue';

const mocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  notifyReady: undefined as (() => void) | undefined,
  notifyUnavailable: undefined as (() => void) | undefined,
  throwOnCreate: false,
}));

vi.mock('../global-background3d-runtime', () => ({
  createGlobalBackground3DRuntime: vi.fn(
    (_canvas: HTMLCanvasElement, options: { onReady?: () => void; onUnavailable?: () => void }) => {
      if (mocks.throwOnCreate) throw new Error('WebGL unavailable');
      mocks.notifyReady = options.onReady;
      mocks.notifyUnavailable = options.onUnavailable;
      return { dispose: mocks.dispose };
    },
  ),
}));

beforeEach(() => {
  mocks.dispose.mockClear();
  mocks.notifyReady = undefined;
  mocks.notifyUnavailable = undefined;
  mocks.throwOnCreate = false;
});

describe('GlobalBackground3D', () => {
  it('crossfades the canvas only after a successful first frame', async () => {
    const wrapper = mount(GlobalBackground3D);
    const canvas = wrapper.get('canvas');

    expect(wrapper.attributes('aria-hidden')).toBe('true');
    expect(canvas.classes()).not.toContain('is-ready');
    expect(wrapper.emitted('readyChange')).toBeUndefined();

    mocks.notifyReady?.();
    await nextTick();

    expect(canvas.classes()).toContain('is-ready');
    expect(wrapper.emitted('readyChange')).toEqual([[true]]);

    wrapper.unmount();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });

  it('returns to the SVG fallback when the runtime becomes unavailable', async () => {
    const wrapper = mount(GlobalBackground3D);

    mocks.notifyReady?.();
    await nextTick();
    mocks.notifyUnavailable?.();
    await nextTick();

    expect(wrapper.get('canvas').classes()).not.toContain('is-ready');
    expect(wrapper.emitted('readyChange')).toEqual([[true], [false]]);
    wrapper.unmount();
  });

  it('keeps the canvas hidden and reports fallback state when initialization fails', () => {
    mocks.throwOnCreate = true;

    const wrapper = mount(GlobalBackground3D);

    expect(wrapper.get('canvas').classes()).not.toContain('is-ready');
    expect(wrapper.emitted('readyChange')).toEqual([[false]]);
    expect(mocks.dispose).not.toHaveBeenCalled();
  });

  it('ignores late runtime callbacks after unmount', async () => {
    const wrapper = mount(GlobalBackground3D);
    wrapper.unmount();
    mocks.notifyReady?.();
    mocks.notifyUnavailable?.();
    await nextTick();

    expect(wrapper.emitted('readyChange')).toBeUndefined();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
});
