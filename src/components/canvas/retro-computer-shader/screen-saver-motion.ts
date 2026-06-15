export type ScreenSaverWallHit = 'left' | 'right';

export interface HorizontalScreenSaverBounce {
  x: number;
  vx: number;
  wallHit?: ScreenSaverWallHit;
}

export interface ScreenSaverFontFitOptions {
  preferredFontSize: number;
  minimumFontSize: number;
  measuredCollisionWidth: number;
  availableWidth: number;
  widthRatio: number;
}

export function resolveResponsiveScreenSaverSpeedMultiplier(viewportWidth: number, fullSpeedBreakpoint: number): number {
  return viewportWidth < fullSpeedBreakpoint ? 0.5 : 1;
}

export function fitScreenSaverFontSize(options: ScreenSaverFontFitOptions): number {
  const preferredFontSize = Math.max(0, options.preferredFontSize);
  const minimumFontSize = Math.max(0, Math.min(options.minimumFontSize, preferredFontSize));
  const availableWidth = Math.max(0, options.availableWidth);
  const measuredCollisionWidth = Math.max(0, options.measuredCollisionWidth);
  const widthRatio = Math.max(0, Math.min(1, options.widthRatio));

  if (measuredCollisionWidth === 0 || availableWidth === 0) return minimumFontSize;

  const fitScale = Math.min(1, (availableWidth * widthRatio) / measuredCollisionWidth);
  return Math.max(minimumFontSize, preferredFontSize * fitScale);
}

export function resolveHorizontalScreenSaverBounce(x: number, vx: number, boundLeft: number, boundRight: number): HorizontalScreenSaverBounce {
  if (x <= boundLeft) {
    return {
      x: boundLeft,
      vx: Math.abs(vx),
      ...(vx < 0 ? { wallHit: 'left' as const } : {}),
    };
  }

  if (x >= boundRight) {
    return {
      x: boundRight,
      vx: -Math.abs(vx),
      ...(vx > 0 ? { wallHit: 'right' as const } : {}),
    };
  }

  return { x, vx };
}
