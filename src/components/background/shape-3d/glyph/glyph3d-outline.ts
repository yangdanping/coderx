import { Box2, Vector2, type Shape } from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { GLYPH_3D_CONFIG, type GlyphOutlineStyle } from '../config';
import displaySvg from './outlines/display-dollar.svg?raw';
import roundedSvg from './outlines/rounded-dollar.svg?raw';
import serifSvg from './outlines/serif-dollar.svg?raw';

const OUTLINE_SVG = {
  display: displaySvg,
  rounded: roundedSvg,
  serif: serifSvg,
} as const satisfies Record<GlyphOutlineStyle, string>;

const OUTLINE_STYLES = new Set<GlyphOutlineStyle>(['rounded', 'display', 'serif']);

export interface GlyphFallbackDescriptor {
  viewBox: string;
  paths: readonly string[];
}

export interface ParsedGlyphOutline {
  shapes: Shape[];
  fallback: GlyphFallbackDescriptor;
}

export function isGlyphOutlineStyle(value: unknown): value is GlyphOutlineStyle {
  return typeof value === 'string' && OUTLINE_STYLES.has(value as GlyphOutlineStyle);
}

function collectPoints(shapes: readonly Shape[]) {
  return shapes.flatMap((shape) => [
    ...shape.getPoints(24),
    ...shape.holes.flatMap((hole) => hole.getPoints(24)),
  ]);
}

export function parseGlyphOutline(svg: string, sourceName: string): ParsedGlyphOutline {
  const result = new SVGLoader().parse(svg);
  const root = result.xml as unknown as SVGElement;
  const viewBox = root.getAttribute('viewBox')?.trim();
  if (!viewBox || viewBox.split(/\s+/).length !== 4) {
    throw new Error(`[glyph3d] ${sourceName} has no valid viewBox`);
  }

  const paths = [...root.querySelectorAll('path')]
    .map((path) => path.getAttribute('d')?.trim())
    .filter((path): path is string => Boolean(path));
  const shapes = result.paths.flatMap((path) => path.toShapes());
  const points = collectPoints(shapes);
  if (shapes.length === 0 || points.length === 0) {
    throw new Error(`[glyph3d] ${sourceName} did not produce any filled shapes`);
  }
  if (!points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) {
    throw new Error(`[glyph3d] ${sourceName} produced non-finite outline coordinates`);
  }

  const size = new Box2().setFromPoints(points).getSize(new Vector2());
  if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || size.x <= 0 || size.y <= 0) {
    throw new Error(`[glyph3d] ${sourceName} has zero-area outline bounds`);
  }

  return {
    shapes,
    fallback: { viewBox, paths },
  };
}

function svgFor(style: GlyphOutlineStyle) {
  if (!isGlyphOutlineStyle(style)) {
    throw new Error(`[glyph3d] Unsupported glyph outline style "${String(style)}"`);
  }
  return OUTLINE_SVG[style];
}

export function createGlyphShapes(style: GlyphOutlineStyle = GLYPH_3D_CONFIG.outlineStyle) {
  return parseGlyphOutline(svgFor(style), style).shapes;
}

export function getGlyphFallback(style: GlyphOutlineStyle = GLYPH_3D_CONFIG.outlineStyle) {
  return parseGlyphOutline(svgFor(style), style).fallback;
}
