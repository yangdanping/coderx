import { Box2, Vector2 } from 'three';
import { describe, expect, it } from 'vitest';
import type { GlyphOutlineStyle } from '../../config';
import displaySvg from '../outlines/display-dollar.svg?raw';
import roundedSvg from '../outlines/rounded-dollar.svg?raw';
import serifSvg from '../outlines/serif-dollar.svg?raw';
import { createGlyphShapes, getGlyphFallback, parseGlyphOutline } from '../glyph3d-outline';

const styles = ['rounded', 'display', 'serif'] as const satisfies readonly GlyphOutlineStyle[];
const assets = { display: displaySvg, rounded: roundedSvg, serif: serifSvg } as const;

function pointsFor(style: GlyphOutlineStyle) {
  return createGlyphShapes(style).flatMap((shape) => [
    ...shape.getPoints(24),
    ...shape.holes.flatMap((hole) => hole.getPoints(24)),
  ]);
}

describe('glyph svg outline parsing', () => {
  it.each(styles)('parses %s into finite, non-zero shapes', (style) => {
    const shapes = createGlyphShapes(style);
    const points = pointsFor(style);
    const bounds = new Box2().setFromPoints(points);
    const size = bounds.getSize(new Vector2());

    expect(shapes.length).toBeGreaterThan(0);
    expect(points.length).toBeGreaterThan(8);
    expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    expect(size.x).toBeGreaterThan(0);
    expect(size.y).toBeGreaterThan(0);
  });

  it('preserves a synthetic hole without assuming the dollar itself has one', () => {
    const fixture = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path fill="#000" fill-rule="evenodd" d="M0 0H100V100H0Z M25 25V75H75V25Z"/>
      </svg>
    `;
    const parsed = parseGlyphOutline(fixture, 'synthetic-hole');

    expect(parsed.shapes).toHaveLength(1);
    expect(parsed.shapes[0]?.holes).toHaveLength(1);
    expect(parsed.fallback).toEqual({
      viewBox: '0 0 100 100',
      paths: ['M0 0H100V100H0Z M25 25V75H75V25Z'],
    });
  });

  it.each(styles)('derives the %s fallback from the selected source asset', (style) => {
    const source = new DOMParser().parseFromString(assets[style], 'image/svg+xml');
    const expectedPaths = [...source.querySelectorAll('path')].map((path) => path.getAttribute('d')!);

    expect(getGlyphFallback(style)).toEqual({
      viewBox: source.documentElement.getAttribute('viewBox'),
      paths: expectedPaths,
    });
  });

  it('rejects an untyped unsupported style with the value in the message', () => {
    expect(() => createGlyphShapes('marker' as GlyphOutlineStyle)).toThrow(
      /Unsupported glyph outline style "marker"/,
    );
  });

  it.each([
    ['empty', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>', /empty did not produce any filled shapes/],
    [
      'zero-area',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0H10Z"/></svg>',
      /zero-area did not produce any filled shapes/,
    ],
    [
      'missing-viewbox',
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0H10V10Z"/></svg>',
      /missing-viewbox has no valid viewBox/,
    ],
  ])('reports a clear validation error for %s', (name, svg, message) => {
    expect(() => parseGlyphOutline(svg, name)).toThrow(message);
  });
});
