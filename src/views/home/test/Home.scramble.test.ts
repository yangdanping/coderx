import { createTestingPinia } from '@pinia/testing';
import { shallowMount } from '@vue/test-utils';
import fs from 'node:fs';
import path from 'node:path';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import ScrambleFrameText from '@/components/scramble/ScrambleFrameText.vue';
import Home from '../Home.vue';

const wallHitScrambleMock = vi.hoisted(() => ({
  advanceOnWallHit: vi.fn(),
  useWallHitScramble: vi.fn(),
}));

vi.mock('../composables/useWallHitScramble', () => ({
  useWallHitScramble: wallHitScrambleMock.useWallHitScramble,
}));

vi.mock('@/components/canvas/retro-computer-shader/RetroComputerShader.vue', () => ({
  default: {
    name: 'RetroComputerShader',
    props: ['screenSaverText', 'screenSaverCollisionText'],
    template: '<div />',
  },
}));

describe('Home scramble title', () => {
  function mountHome() {
    wallHitScrambleMock.advanceOnWallHit.mockReset();
    wallHitScrambleMock.useWallHitScramble.mockReturnValue({
      frame: ref('WrｦterX'),
      screenFrame: ref('wrｦterx'),
      target: ref('WriterX'),
      targetIndex: ref(1),
      isInitialized: ref(true),
      advanceOnWallHit: wallHitScrambleMock.advanceOnWallHit,
    });

    return shallowMount(Home, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: true,
          }),
        ],
      },
    });
  }

  it('renders the shared frame in the title and lowercase retro screen', () => {
    const wrapper = mountHome();
    const title = wrapper.getComponent(ScrambleFrameText);
    const retro = wrapper.getComponent({ name: 'RetroComputerShader' });

    expect(title.props()).toMatchObject({
      frame: 'WrｦterX',
      target: 'WriterX',
    });
    expect(retro.props()).toMatchObject({
      screenSaverText: 'wrｦterx',
      screenSaverCollisionText: 'creatorx',
    });
    expect(wrapper.findComponent({ name: 'CyclingScrambleText' }).exists()).toBe(false);
  });

  it('advances the shared scramble when the retro screen hits either wall', async () => {
    const wrapper = mountHome();
    const retro = wrapper.getComponent({ name: 'RetroComputerShader' });

    retro.vm.$emit('wall-hit', 'left');
    await wrapper.vm.$nextTick();
    retro.vm.$emit('wall-hit', 'right');
    await wrapper.vm.$nextTick();

    expect(wallHitScrambleMock.advanceOnWallHit).toHaveBeenCalledTimes(2);
  });

  it('does not configure completion-driven timer cycling', () => {
    const wrapper = mountHome();

    expect(wrapper.findComponent({ name: 'CyclingScrambleText' }).exists()).toBe(false);
    expect(wrapper.html()).not.toContain('cycle-delay');
  });

  it('keeps the title and retro component in the existing hero layout', () => {
    const wrapper = mountHome();

    expect(wrapper.get('.title-line-2').exists()).toBe(true);
    expect(wrapper.getComponent(ScrambleFrameText).classes()).toContain('title-word');
    expect(wrapper.getComponent({ name: 'RetroComputerShader' }).classes()).toContain('shader');
  });

  it('keeps X gradients and avoids fixed-width title spacing', () => {
    const commonScss = fs.readFileSync(path.join(process.cwd(), 'src/assets/css/common.scss'), 'utf8');
    const homeSource = fs.readFileSync(path.join(process.cwd(), 'src/views/home/Home.vue'), 'utf8');

    expect(commonScss).toContain('--coder-x-gradient:');
    expect(commonScss).toContain('--writer-x-gradient:');
    expect(commonScss).toContain('--creator-x-gradient:');
    expect(commonScss).toContain('--builder-x-gradient:');
    expect(homeSource).not.toContain('width: 7ch');
    expect(homeSource).toContain('.scramble-accent-character');
    expect(homeSource).toContain('.scrambl-cell:first-child');
    expect(homeSource).toContain('overflow: visible !important');
    expect(homeSource).toContain('--scramble-x-cell-width: 1.18ch');
    expect(homeSource).toContain('--scramble-x-gap: 0.02em');
    expect(homeSource).toContain('--scramble-x-right-space: 0.2em');
    expect(homeSource).toContain('width: var(--scramble-x-cell-width) !important');
    expect(homeSource).toContain('margin-left: var(--scramble-x-gap)');
    expect(homeSource).toContain('padding-right: var(--scramble-x-right-space)');
  });

  it('uses content-driven title sizing and stacks before the hero overlaps', () => {
    const homeSource = fs.readFileSync(path.join(process.cwd(), 'src/views/home/Home.vue'), 'utf8');
    const stackedShaderStyles = homeSource.match(/width: min\(100vw, 520px\)[\s\S]*?align-self: center;/)?.[0] ?? '';

    expect(homeSource).toContain('font-size: clamp(40px, 3.9vw, 70px)');
    expect(homeSource).toContain('@media screen and (max-width: 1040px)');
    expect(homeSource).toContain('width: min(100vw, 520px)');
    expect(homeSource).toContain('max-width: none');
    expect(stackedShaderStyles).toContain('margin: 0;');
    expect(stackedShaderStyles).not.toContain('margin: 0 auto;');
  });

  it('increases the mobile title proportion without narrowing the full-width retro canvas', () => {
    const homeSource = fs.readFileSync(path.join(process.cwd(), 'src/views/home/Home.vue'), 'utf8');

    expect(homeSource).toContain('@media screen and (max-width: 600px)');
    expect(homeSource).toContain('font-size: clamp(40px, 11.5vw, 52px)');
    expect(homeSource).toContain('width: min(100vw, 560px)');
    expect(homeSource).toContain('padding-inline: 0;');
    expect(homeSource).toContain('width: min(100vw, 520px)');
  });
});
