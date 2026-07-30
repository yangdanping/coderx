import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';
import ScrambleAcrylicGlyph from '../ScrambleAcrylicGlyph.vue';

describe('ScrambleAcrylicGlyph', () => {
  it('renders every acrylic layer with the current scramble character', () => {
    const wrapper = mount(ScrambleAcrylicGlyph, {
      props: {
        character: 'ケ',
        gradientStartOffset: '30%',
        depthX: 6,
        depthY: 4,
      },
    });
    const depthLayers = wrapper.findAll('.scramble-acrylic-depth');
    const allTextLayers = wrapper.findAll('text');

    expect(wrapper.get('.scramble-acrylic-glyph').attributes('viewBox')).toBe('0 0 70 100');
    expect(depthLayers).toHaveLength(4);
    expect(allTextLayers.every((layer) => layer.text() === 'ケ')).toBe(true);
    expect(allTextLayers.every((layer) => layer.attributes('font-size') === '100')).toBe(true);
    expect(wrapper.get('.scramble-acrylic-face').text()).toBe('ケ');
    expect(wrapper.get('.scramble-acrylic-highlight').text()).toBe('ケ');
    expect(depthLayers.at(3)?.attributes('x')).toBe('41');
    expect(depthLayers.at(3)?.attributes('y')).toBe('90');
    expect(wrapper.get('.scramble-acrylic-edge-gradient .scramble-acrylic-edge-start').attributes('offset')).toBe('30%');
    expect(wrapper.get('.scramble-acrylic-edge-gradient .scramble-acrylic-edge-end').attributes('offset')).toBe('100%');
  });

  it('keeps every gradient id unique across component instances', () => {
    const wrapper = mount(
      defineComponent({
        components: { ScrambleAcrylicGlyph },
        template: `
          <div>
            <ScrambleAcrylicGlyph character="ケ" />
            <ScrambleAcrylicGlyph character="X" />
          </div>
        `,
      }),
    );
    const [first, second] = wrapper.findAllComponents(ScrambleAcrylicGlyph);
    const firstIds = first?.findAll('linearGradient').map((gradient) => gradient.attributes('id')) ?? [];
    const secondIds = second?.findAll('linearGradient').map((gradient) => gradient.attributes('id')) ?? [];

    expect(firstIds).toHaveLength(4);
    expect(secondIds).toHaveLength(4);
    expect(firstIds.every((id) => !secondIds.includes(id))).toBe(true);
    expect(new Set(firstIds).size).toBe(firstIds.length);
    expect(new Set(secondIds).size).toBe(secondIds.length);
  });
});
