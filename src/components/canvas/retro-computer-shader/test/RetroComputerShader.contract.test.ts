import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('RetroComputerShader wall-hit contract', () => {
  it('exposes a stable collision reference and emits horizontal wall hits', () => {
    const componentSource = fs.readFileSync(path.join(process.cwd(), 'src/components/canvas/retro-computer-shader/RetroComputerShader.vue'), 'utf8');
    const typeSource = fs.readFileSync(path.join(process.cwd(), 'src/components/canvas/retro-computer-shader/index.ts'), 'utf8');

    expect(typeSource).toContain('screenSaverCollisionText?: string');
    expect(componentSource).toContain("'wall-hit': [direction: 'left' | 'right']");
    expect(componentSource).toContain('resolveHorizontalScreenSaverBounce(');
    expect(componentSource).toContain("emit('wall-hit', horizontalBounce.wallHit)");
    expect(componentSource).toContain('const collisionText = props.screenSaverCollisionText || text');
    expect(componentSource).toContain('const textOffsetX = (collisionWidth - textWidth) * 0.5');
  });

  it('keeps the stacked canvas large while reserving orbit overscan and slowing the screen saver', () => {
    const componentSource = fs.readFileSync(path.join(process.cwd(), 'src/components/canvas/retro-computer-shader/RetroComputerShader.vue'), 'utf8');

    expect(componentSource).toContain('const STACK_LAYOUT_BREAKPOINT = 1040');
    expect(componentSource).toContain('const MOBILE_EFFECTIVE_SCALE = 1.18');
    expect(componentSource).toContain('if (w <= STACK_LAYOUT_BREAKPOINT) return MOBILE_EFFECTIVE_SCALE');
    expect(componentSource).toContain('resolveResponsiveScreenSaverSpeedMultiplier(windowWidth.value, SCALE_WIDE_BREAKPOINT)');
    expect(componentSource).toContain('props.screenSaverSpeed * responsiveScreenSaverSpeedMultiplier.value');
    expect(componentSource).toContain('const SCREEN_SAVER_COLLISION_WIDTH_RATIO = 0.72');
    expect(componentSource).toContain('fitScreenSaverFontSize({');
  });
});
