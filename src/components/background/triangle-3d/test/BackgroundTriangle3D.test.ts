import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BackgroundTriangle3D from '../BackgroundTriangle3D.vue';
import { TRIANGLE_BODY_COLOR, TRIANGLE_FALLBACK_PATH, TRIANGLE_OUTLINE_COLOR } from '../triangle3d';

const mocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  notifyReady: undefined as (() => void) | undefined,
  throwOnCreate: false,
}));

vi.mock('../triangle3d-runtime', () => ({
  createTriangle3DRuntime: vi.fn((_canvas: HTMLCanvasElement, options: { onReady?: () => void }) => {
    if (mocks.throwOnCreate) throw new Error('WebGL unavailable');
    mocks.notifyReady = options.onReady;
    return { dispose: mocks.dispose };
  }),
}));

beforeEach(() => {
  mocks.dispose.mockClear();
  mocks.notifyReady = undefined;
  mocks.throwOnCreate = false;
});

describe('BackgroundTriangle3D', () => {
  it('shows a non-interactive SVG fallback until WebGL renders', async () => {
    const wrapper = mount(BackgroundTriangle3D);

    expect(wrapper.attributes('aria-hidden')).toBe('true');
    const visibleFallback = wrapper.get('[data-triangle-fallback]');
    expect(visibleFallback.isVisible()).toBe(true);
    const fallbackPath = visibleFallback.get('path');
    expect(fallbackPath.attributes('d')).toBe(TRIANGLE_FALLBACK_PATH);
    expect(fallbackPath.attributes('fill')).toBe(TRIANGLE_BODY_COLOR);
    expect(fallbackPath.attributes('fill-opacity')).toBe('0.28');
    expect(fallbackPath.attributes('stroke')).toBe(TRIANGLE_OUTLINE_COLOR);
    expect(fallbackPath.attributes('stroke-opacity')).toBe('0.42');

    mocks.notifyReady?.();
    await nextTick();
    const fallback = wrapper.get<SVGElement>('[data-triangle-fallback]');
    expect(fallback.element.style.display).toBe('none');

    wrapper.unmount();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });

  it('keeps the SVG fallback when WebGL initialization fails', () => {
    mocks.throwOnCreate = true;

    const wrapper = mount(BackgroundTriangle3D);

    expect(wrapper.get('[data-triangle-fallback]').isVisible()).toBe(true);
    expect(mocks.dispose).not.toHaveBeenCalled();
  });
});
