export type GlyphOutlineStyle = 'rounded' | 'display' | 'serif';

export interface Glyph3DConfig {
  outlineStyle: GlyphOutlineStyle;
  targetHeight: number;
  depth: number;
  curveSegments: number;
  bodyColor: string;
  outlineColor: string;
  capOpacity: number;
  sideOpacity: number;
  outlineOpacity: number;
  outlineWidth: number;
  roughness: number;
  metalness: number;
}

export const FIXED_GLYPH = '$' as const;

export const GLYPH_3D_CONFIG = {
  // Developer selection point: 'rounded' | 'display' | 'serif'.
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
} as const satisfies Glyph3DConfig;
