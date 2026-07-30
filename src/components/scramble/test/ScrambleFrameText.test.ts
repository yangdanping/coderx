import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScrambleAcrylicGlyph from '../ScrambleAcrylicGlyph.vue';
import ScrambleFrameText from '../ScrambleFrameText.vue';

function stubMotionCapabilities({ finePointer = true, reducedMotion = false } = {}) {
  const state = { finePointer, reducedMotion };
  const listeners = {
    finePointer: new Set<EventListenerOrEventListenerObject>(),
    reducedMotion: new Set<EventListenerOrEventListenerObject>(),
  };
  const createQuery = (media: string, key: keyof typeof state) =>
    ({
      get matches() {
        return state[key];
      },
      media,
      onchange: null,
      addEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => listeners[key].add(listener)),
      removeEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => listeners[key].delete(listener)),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList;
  const finePointerQuery = createQuery('(pointer: fine)', 'finePointer');
  const reducedMotionQuery = createQuery('(prefers-reduced-motion: reduce)', 'reducedMotion');

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => (query === '(pointer: fine)' ? finePointerQuery : reducedMotionQuery)),
  );

  const setCapability = (key: keyof typeof state, value: boolean) => {
    state[key] = value;
    const media = key === 'finePointer' ? '(pointer: fine)' : '(prefers-reduced-motion: reduce)';
    const event = { matches: value, media } as MediaQueryListEvent;

    listeners[key].forEach((listener) => {
      if (typeof listener === 'function') listener(event);
      else listener.handleEvent(event);
    });
  };

  return {
    setFinePointer: (value: boolean) => setCapability('finePointer', value),
    setReducedMotion: (value: boolean) => setCapability('reducedMotion', value),
  };
}

describe('ScrambleFrameText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders one stable cell per controlled frame character', () => {
    const wrapper = mount(ScrambleFrameText, {
      props: {
        as: 'strong',
        frame: 'WrｱterX',
        target: 'WriterX',
      },
    });

    expect(wrapper.element.tagName).toBe('STRONG');
    expect(wrapper.attributes('data-scramble-word')).toBe('WriterX');
    expect(wrapper.attributes('aria-label')).toBe('WriterX');
    expect(wrapper.findAll('.scrambl-cell')).toHaveLength(7);
    expect(wrapper.findAll('.scrambl-cell').map((cell) => cell.text())).toEqual(['W', 'r', 'ｱ', 't', 'e', 'r', 'X']);
    expect(wrapper.findAll('.scrambl-cell').every((cell) => cell.attributes('aria-hidden') === 'true')).toBe(true);
  });

  it('marks the target X cell instead of a trailing transient cell', () => {
    const wrapper = mount(ScrambleFrameText, {
      props: {
        frame: 'BuilderX',
        target: 'CoderX',
      },
    });
    const cells = wrapper.findAll('.scrambl-cell');

    expect(cells[5].classes()).toContain('scramble-accent-character');
    expect(cells[7].classes()).not.toContain('scramble-accent-character');
  });

  it('renders the accent cell as a hollow gradient outline when enabled', () => {
    const wrapper = mount(
      defineComponent({
        components: { ScrambleFrameText },
        template: `
          <div>
            <ScrambleFrameText frame="BuilderX" target="BuilderX" accent-outline />
            <ScrambleFrameText frame="CoderX" target="CoderX" accent-outline accent-gradient-start-offset="30%" />
          </div>
        `,
      }),
    );
    const [firstTitle, secondTitle] = wrapper.findAllComponents(ScrambleFrameText);
    const accentCell = firstTitle?.findAll('.scrambl-cell').at(7);
    const outlineGlyph = accentCell?.get('.scramble-outline-glyph');
    const gradient = firstTitle?.get('linearGradient');
    const gradientId = gradient?.attributes('id');
    const outlineCharacter = firstTitle?.get('.scramble-outline-character');

    expect(accentCell?.classes()).toContain('scramble-accent-outline');
    expect(outlineGlyph?.exists()).toBe(true);
    expect(outlineGlyph?.attributes('viewBox')).toBe('0 0 70 100');
    expect(outlineCharacter?.text()).toBe('X');
    expect(outlineCharacter?.attributes('x')).toBe('35');
    expect(outlineCharacter?.attributes('font-size')).toBe('100');
    expect(outlineCharacter?.attributes('fill')).toBe('none');
    expect(outlineCharacter?.attributes('stroke')).toBe(`url(#${gradientId})`);
    expect(gradient?.get('.scramble-outline-gradient-start').attributes('offset')).toBe('20%');
    expect(gradient?.get('.scramble-outline-gradient-end').attributes('offset')).toBe('100%');
    expect(secondTitle?.get('linearGradient').attributes('id')).not.toBe(gradientId);
    expect(secondTitle?.get('.scramble-outline-gradient-start').attributes('offset')).toBe('30%');
  });

  it('applies acrylic material to the live target-index scramble character', () => {
    const wrapper = mount(ScrambleFrameText, {
      props: {
        frame: 'Writerケ',
        target: 'WriterX',
        accentAcrylic: true,
        accentDepthX: 6,
        accentDepthY: 4,
      },
    });
    const accentCell = wrapper.get('.scramble-accent-character');

    expect(accentCell.classes()).toContain('scramble-accent-acrylic');
    expect(wrapper.getComponent(ScrambleAcrylicGlyph).props()).toMatchObject({
      character: 'ケ',
      depthX: 6,
      depthY: 4,
    });
  });

  it('tilts toward a fine pointer and returns to the configured default orientation', async () => {
    stubMotionCapabilities();
    let frameCallback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 17;
    });
    const cancelFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const wrapper = mount(ScrambleFrameText, {
      props: {
        frame: 'WriterX',
        target: 'WriterX',
        accentAcrylic: true,
        accentFollowPointer: true,
        accentDefaultTiltX: -3,
        accentDefaultTiltY: 6,
        accentDepthX: 5,
        accentDepthY: 5,
        accentMaxPointerTilt: 7,
      },
    });
    vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    wrapper.element.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 200, clientY: 0 }));
    await wrapper.vm.$nextTick();
    expect(requestFrame).toHaveBeenCalledTimes(1);
    frameCallback?.(0);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-x: 4deg');
    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-y: 13deg');
    expect(wrapper.getComponent(ScrambleAcrylicGlyph).props()).toMatchObject({
      depthX: 3.5,
      depthY: 6.5,
    });

    await wrapper.trigger('pointerleave');

    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-x: -3deg');
    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-y: 6deg');
    expect(wrapper.getComponent(ScrambleAcrylicGlyph).props()).toMatchObject({
      depthX: 5,
      depthY: 5,
    });
    expect(cancelFrame).not.toHaveBeenCalled();
  });

  it('returns to the configured default orientation when pointer following is switched off after tilting', async () => {
    stubMotionCapabilities();
    let frameCallback: FrameRequestCallback | undefined;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback;
        return 19;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const wrapper = mount(ScrambleFrameText, {
      props: {
        frame: 'WriterX',
        target: 'WriterX',
        accentAcrylic: true,
        accentFollowPointer: true,
        accentDefaultTiltX: -3,
        accentDefaultTiltY: 6,
        accentDepthX: 5,
        accentDepthY: 5,
      },
    });
    vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    wrapper.element.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 200, clientY: 0 }));
    frameCallback?.(0);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-y: 13deg');

    await wrapper.setProps({ accentFollowPointer: false });

    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-x: -3deg');
    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-y: 6deg');
    expect(wrapper.getComponent(ScrambleAcrylicGlyph).props()).toMatchObject({
      depthX: 5,
      depthY: 5,
    });
  });

  it('returns to the configured default orientation when reduced motion is enabled after tilting', async () => {
    const { setReducedMotion } = stubMotionCapabilities();
    let frameCallback: FrameRequestCallback | undefined;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback;
        return 23;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const wrapper = mount(ScrambleFrameText, {
      props: {
        frame: 'WriterX',
        target: 'WriterX',
        accentAcrylic: true,
        accentFollowPointer: true,
        accentDefaultTiltX: -3,
        accentDefaultTiltY: 6,
        accentDepthX: 5,
        accentDepthY: 5,
      },
    });
    vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    wrapper.element.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 200, clientY: 0 }));
    frameCallback?.(0);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-y: 13deg');

    setReducedMotion(true);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-x: -3deg');
    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-y: 6deg');
    expect(wrapper.getComponent(ScrambleAcrylicGlyph).props()).toMatchObject({
      depthX: 5,
      depthY: 5,
    });
  });

  it.each([
    { label: 'pointer following is disabled', followPointer: false, finePointer: true, reducedMotion: false },
    { label: 'the pointer is not fine', followPointer: true, finePointer: false, reducedMotion: false },
    { label: 'reduced motion is requested', followPointer: true, finePointer: true, reducedMotion: true },
  ])('keeps the configured default orientation when $label', async ({ followPointer, finePointer, reducedMotion }) => {
    stubMotionCapabilities({ finePointer, reducedMotion });
    const requestFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    const wrapper = mount(ScrambleFrameText, {
      props: {
        frame: 'WriterX',
        target: 'WriterX',
        accentAcrylic: true,
        accentFollowPointer: followPointer,
        accentDefaultTiltX: -4,
        accentDefaultTiltY: 5,
      },
    });

    wrapper.element.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 120, clientY: 10 }));
    await wrapper.vm.$nextTick();

    expect(requestFrame).not.toHaveBeenCalled();
    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-x: -4deg');
    expect(wrapper.get('.scramble-accent-acrylic').attributes('style')).toContain('--scramble-acrylic-tilt-y: 5deg');
  });

  it('cancels a pending pointer frame when unmounted', async () => {
    stubMotionCapabilities();
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 29),
    );
    const cancelFrame = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const wrapper = mount(ScrambleFrameText, {
      props: {
        frame: 'WriterX',
        target: 'WriterX',
        accentAcrylic: true,
        accentFollowPointer: true,
      },
    });
    vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    wrapper.element.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 150, clientY: 25 }));
    await wrapper.vm.$nextTick();
    wrapper.unmount();

    expect(cancelFrame).toHaveBeenCalledWith(29);
  });

  it('keeps ordinary text rendering when the outline is disabled', () => {
    const wrapper = mount(ScrambleFrameText, {
      props: {
        frame: 'CoderX',
        target: 'CoderX',
      },
    });

    expect(wrapper.find('.scramble-outline-glyph').exists()).toBe(false);
    expect(wrapper.findAll('.scrambl-cell').at(5)?.text()).toBe('X');
  });

  it('keeps the target metadata while the initialization frame is blank', () => {
    const wrapper = mount(ScrambleFrameText, {
      props: {
        frame: '',
        target: 'CoderX',
      },
    });

    expect(wrapper.attributes('data-scramble-word')).toBe('CoderX');
    expect(wrapper.attributes('aria-label')).toBe('CoderX');
    expect(wrapper.findAll('.scrambl-cell')).toHaveLength(0);
  });
});
