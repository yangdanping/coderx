import { mount } from '@vue/test-utils';
import fs from 'node:fs';
import path from 'node:path';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';
import ScrambleAcrylicGlyph from '../ScrambleAcrylicGlyph.vue';
import ScrambleFrameText from '../ScrambleFrameText.vue';

describe('ScrambleFrameText', () => {
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
        accentTiltX: -4,
        accentTiltY: 5,
        accentDepthX: 6,
        accentDepthY: 4,
      },
    });
    const accentCell = wrapper.get('.scramble-accent-character');

    expect(accentCell.classes()).toContain('scramble-accent-acrylic');
    expect(accentCell.attributes('style')).toContain('--scramble-acrylic-tilt-x: -4deg');
    expect(accentCell.attributes('style')).toContain('--scramble-acrylic-tilt-y: 5deg');
    expect(wrapper.getComponent(ScrambleAcrylicGlyph).props()).toMatchObject({
      character: 'ケ',
      depthX: 6,
      depthY: 4,
    });
  });

  it('contains no pointer-follow runtime', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/components/scramble/ScrambleFrameText.vue'), 'utf8');

    expect(source).not.toContain('accentFollowPointer');
    expect(source).not.toContain('accentMaxPointerTilt');
    expect(source).not.toContain('PointerEvent');
    expect(source).not.toContain('MouseEvent');
    expect(source).not.toContain('TouchEvent');
    expect(source).not.toContain('matchMedia');
    expect(source).not.toContain('requestAnimationFrame');
    expect(source).not.toContain('cancelAnimationFrame');
    expect(source).not.toContain('addEventListener');
    expect(source).not.toContain('@pointermove');
    expect(source).not.toContain('@pointerleave');
    expect(source).not.toContain('@pointerdown');
    expect(source).not.toContain('@pointerup');
    expect(source).not.toContain('v-on');
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
