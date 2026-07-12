import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('NavBar layout contract', () => {
  it('keeps search in the right-side cluster at every viewport size', () => {
    const source = readSource('src/components/navbar/NavBar.vue');
    const rightSlot = source.match(/<NavBarRight>[\s\S]*?<\/NavBarRight>/)?.[0] ?? '';
    const centerSlot = source.match(/<div class="center"[\s\S]*?<\/div>\n\s*<!-- 右边区域/)?.[0] ?? '';

    expect(rightSlot).toContain('<NavMenu v-if="toggleNavMenu"');
    expect(rightSlot).toContain('<NavBarSearch />');
    expect(rightSlot.indexOf('<NavMenu')).toBeLessThan(rightSlot.indexOf('<NavBarSearch'));
    expect(centerSlot).not.toContain('<NavMenu');
    expect(centerSlot).not.toContain('<NavBarSearch');
    expect(source).toContain('return width === 0 || width > 768;');
  });

  it('exposes configurable glass reveal distances and feeds scroll progress into a dedicated layer', () => {
    const source = readSource('src/components/navbar/NavBar.vue');
    const navStyle = source.split('\n  .list {')[0] ?? '';

    expect(source).toContain('glassRevealStart?: number;');
    expect(source).toContain('glassRevealEnd?: number;');
    expect(source).toMatch(/glassRevealStart:\s*0/);
    expect(source).toMatch(/glassRevealEnd:\s*96/);
    expect(source).toContain('useNavbarGlass({');
    expect(source).toContain('start: () => props.glassRevealStart');
    expect(source).toContain('end: () => props.glassRevealEnd');
    expect(source).toContain("'--navbar-glass-progress': glassProgress");
    expect(navStyle).toContain('&::before');
    expect(navStyle).toContain('background-color: var(--glass-bg);');
    expect(navStyle).toContain('backdrop-filter: var(--glass-blur);');
    expect(navStyle).toContain('opacity: var(--navbar-glass-progress);');
    expect(navStyle).toContain('box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.2);');
    expect(navStyle).not.toContain('@include glass-effect;');
  });

  it('uses semantic controls for header actions', () => {
    const navSource = readSource('src/components/navbar/NavBar.vue');
    const leftSource = readSource('src/components/navbar/cpns/NavBarLeft.vue');

    expect(navSource).toContain('<button type="button" class="back-icon"');
    expect(navSource).not.toContain('<i class="back-icon"');
    expect(leftSource).toContain('aria-label="返回首页"');
    expect(leftSource).toContain('width="158"');
    expect(leftSource).toContain('height="55"');
  });

  it('orders right-side actions as search, nav, avatar, theme, notification, history', () => {
    const source = readSource('src/components/navbar/cpns/NavBarRight.vue');

    const slotIndex = source.indexOf('<slot name="right"');
    const userIndex = source.indexOf('<NavBarUser');
    const themeIndex = source.indexOf('class="theme-btn-wrapper"');
    const notificationIndex = source.indexOf('<NavBarNotification');
    const historyIndex = source.indexOf('<NavBarUserHistory');

    expect(slotIndex).toBeGreaterThan(-1);
    expect(userIndex).toBeGreaterThan(slotIndex);
    expect(themeIndex).toBeGreaterThan(userIndex);
    expect(notificationIndex).toBeGreaterThan(themeIndex);
    expect(historyIndex).toBeGreaterThan(notificationIndex);
  });

  it('keeps the logo in a bounded left rail instead of the centered content rail', () => {
    const source = readSource('src/components/navbar/NavBar.vue');

    expect(source).toContain('grid-template-columns');
    expect(source).toContain('var(--navbar-logo-rail)');
    expect(source).toContain('justify-self: start');
    expect(source).toContain('box-sizing: border-box');
  });

  it('uses the compact wordmark logo from the header reference', () => {
    const logoSource = readSource('src/assets/img/logo.svg');

    expect(logoSource).toContain('viewBox="73 34 158 55"');
    expect(logoSource).not.toContain('data-background-color');
  });
});
