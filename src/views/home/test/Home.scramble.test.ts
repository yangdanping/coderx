import { createTestingPinia } from '@pinia/testing';
import { shallowMount } from '@vue/test-utils';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import CyclingScrambleText from '@/components/scramble/CyclingScrambleText.vue';
import { CODERX_ROLE_TITLES, DEFAULT_SCRAMBLE_PRESET } from '@/components/scramble/scramble.constants';
import Home from '../Home.vue';

vi.mock('@/components/canvas/retro-computer-shader/RetroComputerShader.vue', () => ({
  default: {
    name: 'RetroComputerShader',
    template: '<div />',
  },
}));

describe('Home scramble title', () => {
  it('animates each role together with its trailing X', () => {
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

    expect(scramble.props('words')).toEqual(CODERX_ROLE_TITLES);
    expect(scramble.props('preset')).toBe(DEFAULT_SCRAMBLE_PRESET);
    expect(scramble.props('cycleDelay')).toBe(2000);
    expect(wrapper.find('.title-x').exists()).toBe(false);
  });

  it('defines one X gradient per role and avoids fixed-width title spacing', () => {
    const commonScss = fs.readFileSync(path.join(process.cwd(), 'src/assets/css/common.scss'), 'utf8');
    const homeSource = fs.readFileSync(path.join(process.cwd(), 'src/views/home/Home.vue'), 'utf8');

    expect(commonScss).toContain('--coder-x-gradient:');
    expect(commonScss).toContain('--writer-x-gradient:');
    expect(commonScss).toContain('--creator-x-gradient:');
    expect(commonScss).toContain('--builder-x-gradient:');
    expect(homeSource).not.toContain('width: 7ch');
    expect(homeSource).toContain('.scrambl-cell:last-child');
    expect(homeSource).toContain('.scrambl-cell:first-child');
    expect(homeSource).toContain('overflow: visible !important');
    expect(homeSource).toContain('--scramble-x-cell-width: 1.18ch');
    expect(homeSource).toContain('--scramble-x-gap: 0.02em');
    expect(homeSource).toContain('--scramble-x-right-space: 0.2em');
    expect(homeSource).toContain('width: var(--scramble-x-cell-width) !important');
    expect(homeSource).toContain('margin-left: var(--scramble-x-gap)');
    expect(homeSource).toContain('padding-right: var(--scramble-x-right-space)');
  });
});
