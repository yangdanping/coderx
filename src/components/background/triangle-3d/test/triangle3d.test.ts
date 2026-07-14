import { Box3, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  STATIC_ROTATION,
  TRIANGLE_TOTAL_DEPTH,
  TRIANGLE_WORLD_POSITION,
  calculateCoverFrustum,
  createRandomRotationTarget,
  createTriangleObject,
  easeInOutQuint,
} from '../triangle3d';

describe('triangle3d scene model', () => {
  it('builds the original rounded silhouette as a 14-unit deep centered object', () => {
    const object = createTriangleObject();
    const bounds = new Box3().setFromObject(object.group);
    const size = bounds.getSize(new Vector3());

    expect(size.x).toBeGreaterThanOrEqual(110);
    expect(size.y).toBeGreaterThanOrEqual(96);
    expect(size.z).toBeCloseTo(TRIANGLE_TOTAL_DEPTH, 4);
    expect(TRIANGLE_WORLD_POSITION).toEqual({ x: -482.5, y: -130, z: 0 });

    object.dispose();
  });

  it('uses a 1.5 CSS pixel coral outline', () => {
    const object = createTriangleObject();

    expect(object.outlineMaterial.linewidth).toBe(1.5);
    expect(object.outlineMaterial.opacity).toBe(0.8);
    expect(object.outlineMaterial.color.getHexString()).toBe('ee675c');

    object.dispose();
  });

  it('disposes every owned GPU resource', () => {
    const object = createTriangleObject();
    const disposeSpies = object.disposables.map((resource) => vi.spyOn(resource, 'dispose'));

    object.dispose();

    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });

  it.each([
    [1400, 800, { left: -700, right: 700, top: 400, bottom: -400 }],
    [1440, 900, { left: -640, right: 640, top: 400, bottom: -400 }],
  ])('matches center/cover framing at %d×%d', (width, height, expected) => {
    expect(calculateCoverFrustum(width, height)).toEqual(expected);
  });

  it('keeps random targets slow, tilted, and inside the safe viewing envelope', () => {
    const values = [0, 0.25, 0.5, 0.75, 1];
    let index = 0;
    const random = () => values[index++ % values.length] ?? 0;
    const target = createRandomRotationTarget(STATIC_ROTATION.z, random);

    expect(target.durationMs).toBeGreaterThanOrEqual(18_000);
    expect(target.durationMs).toBeLessThanOrEqual(28_000);
    expect(Math.abs(target.eulerDegrees.x)).toBeLessThanOrEqual(35);
    expect(Math.abs(target.eulerDegrees.y)).toBeLessThanOrEqual(35);
    expect(Math.max(Math.abs(target.eulerDegrees.x), Math.abs(target.eulerDegrees.y))).toBeGreaterThanOrEqual(12);
    expect(Math.abs(target.deltaZDegrees)).toBeGreaterThanOrEqual(35);
    expect(Math.abs(target.deltaZDegrees)).toBeLessThanOrEqual(110);
  });

  it('uses a clamped ease-in-out curve', () => {
    expect(easeInOutQuint(-1)).toBe(0);
    expect(easeInOutQuint(0)).toBe(0);
    expect(easeInOutQuint(0.5)).toBe(0.5);
    expect(easeInOutQuint(1)).toBe(1);
    expect(easeInOutQuint(2)).toBe(1);
  });
});
