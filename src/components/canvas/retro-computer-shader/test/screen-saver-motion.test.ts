import { describe, expect, it } from 'vitest';
import { fitScreenSaverFontSize, resolveHorizontalScreenSaverBounce, resolveResponsiveScreenSaverSpeedMultiplier } from '../screen-saver-motion';

describe('resolveResponsiveScreenSaverSpeedMultiplier', () => {
  it('keeps full speed at the first responsive breakpoint', () => {
    expect(resolveResponsiveScreenSaverSpeedMultiplier(1470, 1470)).toBe(1);
  });

  it('halves speed below the first responsive breakpoint', () => {
    expect(resolveResponsiveScreenSaverSpeedMultiplier(1469, 1470)).toBe(0.5);
    expect(resolveResponsiveScreenSaverSpeedMultiplier(390, 1470)).toBe(0.5);
  });
});

describe('resolveHorizontalScreenSaverBounce', () => {
  it('reflects and reports a left-wall hit while moving left', () => {
    expect(resolveHorizontalScreenSaverBounce(-2, -1, 0, 100)).toEqual({
      x: 0,
      vx: 1,
      wallHit: 'left',
    });
  });

  it('reflects and reports a right-wall hit while moving right', () => {
    expect(resolveHorizontalScreenSaverBounce(102, 0.75, 0, 100)).toEqual({
      x: 100,
      vx: -0.75,
      wallHit: 'right',
    });
  });

  it('clamps without reporting when perspective moves a wall over text already travelling away', () => {
    expect(resolveHorizontalScreenSaverBounce(-2, 1, 0, 100)).toEqual({
      x: 0,
      vx: 1,
    });
    expect(resolveHorizontalScreenSaverBounce(102, -1, 0, 100)).toEqual({
      x: 100,
      vx: -1,
    });
  });

  it('keeps position and velocity unchanged inside the horizontal bounds', () => {
    expect(resolveHorizontalScreenSaverBounce(40, 0.75, 0, 100)).toEqual({
      x: 40,
      vx: 0.75,
    });
  });
});

describe('fitScreenSaverFontSize', () => {
  it('keeps the preferred font size when the collision text already fits', () => {
    expect(
      fitScreenSaverFontSize({
        preferredFontSize: 34,
        minimumFontSize: 8,
        measuredCollisionWidth: 160,
        availableWidth: 240,
        widthRatio: 0.72,
      }),
    ).toBe(34);
  });

  it('shrinks the font while preserving horizontal travel space on narrow screens', () => {
    expect(
      fitScreenSaverFontSize({
        preferredFontSize: 34,
        minimumFontSize: 8,
        measuredCollisionWidth: 160,
        availableWidth: 96,
        widthRatio: 0.72,
      }),
    ).toBeCloseTo(14.688);
  });

  it('never shrinks below the readable minimum', () => {
    expect(
      fitScreenSaverFontSize({
        preferredFontSize: 34,
        minimumFontSize: 8,
        measuredCollisionWidth: 160,
        availableWidth: 20,
        widthRatio: 0.72,
      }),
    ).toBe(8);
  });
});
