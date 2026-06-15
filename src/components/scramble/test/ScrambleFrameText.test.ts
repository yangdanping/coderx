import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
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
