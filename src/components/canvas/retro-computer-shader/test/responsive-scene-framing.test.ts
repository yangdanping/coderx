import { describe, expect, it } from 'vitest';
import { MOBILE_SCENE_OFFSET_X, STACK_LAYOUT_BREAKPOINT, resolveResponsiveSceneOffsetX } from '../responsive-scene-framing';

describe('responsive retro scene framing', () => {
  it('shifts the stacked scene right without changing desktop framing', () => {
    expect(resolveResponsiveSceneOffsetX(STACK_LAYOUT_BREAKPOINT + 1)).toBe(0);
    expect(resolveResponsiveSceneOffsetX(STACK_LAYOUT_BREAKPOINT)).toBe(MOBILE_SCENE_OFFSET_X);
    expect(resolveResponsiveSceneOffsetX(390)).toBe(MOBILE_SCENE_OFFSET_X);
    expect(resolveResponsiveSceneOffsetX(320)).toBe(MOBILE_SCENE_OFFSET_X);
  });

  it('keeps the widest orbit inside the mobile horizontal view at drag limits', () => {
    const scale = 1.18;
    const visibleHalfWidth = 0.5 / scale;
    const orbitHalfWidth = Math.hypot(0.4 * Math.cos(0.08), 0.14 * Math.sin(0.08));
    const minimumScenePadding = 0.01;

    for (const yaw of [-0.7, -0.55, 0, 0.55, 0.7]) {
      const projectedCenterX = Math.cos(yaw) * -0.07 + MOBILE_SCENE_OFFSET_X;

      expect(projectedCenterX - orbitHalfWidth).toBeGreaterThan(-visibleHalfWidth + minimumScenePadding);
      expect(projectedCenterX + orbitHalfWidth).toBeLessThan(visibleHalfWidth - minimumScenePadding);
    }
  });
});
