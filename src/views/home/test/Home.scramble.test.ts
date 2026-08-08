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
    const title = wrapper.findAllComponents(ScrambleFrameText).find((component) => !component.classes().includes('title-word-sizer'));
    const retro = wrapper.getComponent({ name: 'RetroComputerShader' });

    expect(title?.props()).toMatchObject({
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
    const titleWords = wrapper.findAllComponents(ScrambleFrameText);
    const [sizer, visible] = titleWords;

    expect(wrapper.get('.title-line-2').exists()).toBe(true);
    expect(titleWords).toHaveLength(2);
    expect(sizer?.props()).toMatchObject({
      accentAcrylic: true,
      accentTiltX: -3,
      accentTiltY: 6,
      accentDepthX: 5,
      accentDepthY: 5,
    });
    expect(visible?.props()).toMatchObject({
      accentAcrylic: true,
      accentTiltX: -3,
      accentTiltY: 6,
      accentDepthX: 5,
      accentDepthY: 5,
    });
    expect(sizer?.props()).not.toHaveProperty('accentFollowPointer');
    expect(visible?.props()).not.toHaveProperty('accentFollowPointer');
    expect(visible?.props()).not.toHaveProperty('accentMaxPointerTilt');
    expect(sizer?.classes()).toContain('title-word-sizer');
    expect(visible?.classes()).toContain('title-word');
    expect(visible?.classes()).not.toContain('title-word-sizer');
    expect(wrapper.getComponent({ name: 'RetroComputerShader' }).classes()).toContain('shader');
  });

  it('reserves desktop title width with the longest role title and hides the sizer when stacked', () => {
    const homeSource = fs.readFileSync(path.join(process.cwd(), 'src/views/home/Home.vue'), 'utf8');
    const stackedTitleStyles = homeSource.match(/@media screen and \(max-width: 1040px\)[\s\S]*?\.title-word-sizer\s*\{[\s\S]*?\}/)?.[0] ?? '';

    expect(homeSource).toContain('title-word-sizer');
    expect(homeSource).toContain('titleWidthReserve');
    expect(homeSource).toContain('display: grid');
    expect(homeSource).toContain('grid-area: 1 / 1');
    expect(stackedTitleStyles).toContain('display: none');
  });

  it('offsets the title-section mesh by both the hero spacing and navbar height', () => {
    const homeSource = fs.readFileSync(path.join(process.cwd(), 'src/views/home/Home.vue'), 'utf8');
    const uncommentedHomeSource = homeSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    expect(uncommentedHomeSource).toMatch(
      /\.title-section\s*\{[^{}]*&::before\s*\{[^{}]*top\s*:\s*calc\(\s*-1\s*\*\s*var\(\s*--hero-mesh-offset-top\s*\)\s*-\s*var\(\s*--navbarHeight\s*\)\s*\)\s*;/,
    );
  });

  it('places the article discovery link inside the hero title block', () => {
    const wrapper = mountHome();
    const title = wrapper.get('.title');

    expect(title.getComponent({ name: 'HomeExploreLink' }).exists()).toBe(true);
    expect(wrapper.get('.title-section').findComponent({ name: 'HomeExploreLink' }).exists()).toBe(true);
  });

  it('keeps X gradients and avoids fixed-width title spacing', () => {
    const commonScss = fs.readFileSync(path.join(process.cwd(), 'src/assets/css/common.scss'), 'utf8');
    const homeSource = fs.readFileSync(path.join(process.cwd(), 'src/views/home/Home.vue'), 'utf8');

    expect(commonScss).toContain('--coder-x-gradient:');
    expect(commonScss).toContain('--writer-x-gradient:');
    expect(commonScss).toContain('--creator-x-gradient:');
    expect(commonScss).toContain('--builder-x-gradient:');
    expect(commonScss).toContain('--coder-x-gradient-start: rgba(74, 166, 64, 0.94)');
    expect(commonScss).toContain('--coder-x-gradient-end: rgba(54, 70, 225, 0.94)');
    expect(commonScss).toContain('--writer-x-gradient-start: rgba(187, 120, 0, 0.95)');
    expect(commonScss).toContain('--writer-x-gradient-end: rgba(211, 80, 24, 0.94)');
    expect(commonScss).toContain('--creator-x-gradient-start: rgba(218, 54, 125, 0.93)');
    expect(commonScss).toContain('--creator-x-gradient-end: rgba(116, 20, 215, 0.92)');
    expect(commonScss).toContain('--builder-x-gradient-start: rgba(0, 143, 166, 0.95)');
    expect(commonScss).toContain('--builder-x-gradient-end: rgba(0, 96, 205, 0.94)');
    expect(commonScss).toMatch(/html\.dark[\s\S]*--coder-x-gradient-start:\s*rgba\(143,\s*235,\s*135,\s*0\.7\)/);
    expect(commonScss).toMatch(/html\.dark[\s\S]*--writer-x-gradient-start:\s*rgba\(255,\s*211,\s*88,\s*0\.82\)/);
    expect(commonScss).toMatch(/html\.dark[\s\S]*--creator-x-gradient-start:\s*rgba\(255,\s*111,\s*174,\s*0\.78\)/);
    expect(commonScss).toMatch(/html\.dark[\s\S]*--builder-x-gradient-start:\s*rgba\(0,\s*240,\s*255,\s*0\.72\)/);
    expect(homeSource).not.toContain('width: 7ch');
    expect(homeSource).toContain('.scramble-accent-character');
    expect(homeSource).toContain('--scramble-accent-gradient-start');
    expect(homeSource).toContain('--scramble-accent-gradient-end');
    expect(homeSource).toContain('--scramble-accent-gradient-start: var(--coder-x-gradient-start)');
    expect(homeSource).toContain('--scramble-accent-gradient-end: var(--coder-x-gradient-end)');
    expect(homeSource).toContain('--scramble-accent-gradient-start: var(--writer-x-gradient-start)');
    expect(homeSource).toContain('--scramble-accent-gradient-end: var(--writer-x-gradient-end)');
    expect(homeSource).toContain('--scramble-accent-gradient-start: var(--creator-x-gradient-start)');
    expect(homeSource).toContain('--scramble-accent-gradient-end: var(--creator-x-gradient-end)');
    expect(homeSource).toContain('--scramble-accent-gradient-start: var(--builder-x-gradient-start)');
    expect(homeSource).toContain('--scramble-accent-gradient-end: var(--builder-x-gradient-end)');
    expect(homeSource).toContain('accent-gradient-start-offset');
    expect(homeSource).toContain('.scrambl-cell:first-child');
    expect(homeSource).toContain('overflow: visible !important');
    expect(homeSource).toContain('--scramble-x-cell-width: 1.18ch');
    expect(homeSource).toContain('--scramble-x-gap: 0.02em');
    expect(homeSource).toContain('--scramble-x-right-space: 0.2em');
    expect(homeSource).toContain('width: var(--scramble-x-cell-width) !important');
    expect(homeSource).toContain('margin-left: var(--scramble-x-gap)');
    expect(homeSource).not.toContain('accent-follow-pointer');
    expect(homeSource).not.toContain('accent-max-pointer-tilt');
    expect(homeSource).toContain('padding-right: var(--scramble-x-right-space)');
    expect(homeSource).toContain(':not(.scramble-accent-outline):not(.scramble-accent-acrylic)');
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
