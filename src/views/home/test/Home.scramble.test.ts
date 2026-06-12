import { createTestingPinia } from '@pinia/testing';
import { shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import CyclingScrambleText from '@/components/scramble/CyclingScrambleText.vue';
import { CODERX_ROLE_WORDS, DEFAULT_SCRAMBLE_PRESET } from '@/components/scramble/scramble.constants';
import Home from '../Home.vue';

vi.mock('@/components/canvas/retro-computer-shader/RetroComputerShader.vue', () => ({
  default: {
    name: 'RetroComputerShader',
    template: '<div />',
  },
}));

describe('Home scramble title', () => {
  it('cycles role words with the default preset while rendering a fixed X', () => {
    const wrapper = shallowMount(Home, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: true,
          }),
        ],
      },
    });

    const scramble = wrapper.getComponent(CyclingScrambleText);

    expect(scramble.props('words')).toEqual(CODERX_ROLE_WORDS);
    expect(scramble.props('preset')).toBe(DEFAULT_SCRAMBLE_PRESET);
    expect(scramble.props('cycleDelay')).toBe(2000);
    expect(wrapper.get('.title-x').text()).toBe('X');
    expect(wrapper.find('.isLast').exists()).toBe(false);
  });
});
