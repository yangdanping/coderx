import { describe, expect, it } from 'vitest';
import { TRIANGLE_SHAPE_CONFIG as directTriangleConfig } from '../triangle/triangle3d';
import { FIXED_GLYPH, GLYPH_3D_CONFIG, TRIANGLE_SHAPE_CONFIG } from './index';

describe('shape 3d configuration entry', () => {
  it('fixes the runtime glyph and exposes all developer-selectable defaults', () => {
    expect(FIXED_GLYPH).toBe('$');
    expect(GLYPH_3D_CONFIG).toEqual({
      outlineStyle: 'rounded',
      targetHeight: 112,
      depth: 24,
      curveSegments: 16,
      bodyColor: '#f8cbc6',
      outlineColor: '#f7aaa3',
      capOpacity: 0.28,
      sideOpacity: 0.26,
      outlineOpacity: 0.42,
      outlineWidth: 1,
      roughness: 0.95,
      metalness: 0,
    });
  });

  it('re-exports the accepted arrow config without creating a second source of truth', () => {
    expect(TRIANGLE_SHAPE_CONFIG).toBe(directTriangleConfig);
  });
});
