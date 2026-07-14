import { Box3, Color, Euler, MathUtils, Mesh, Vector3 } from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { describe, expect, it, vi } from 'vitest';
import {
  ORBIT_DURATION_MS,
  STATIC_ROTATION,
  TRIANGLE_BODY_COLOR,
  TRIANGLE_FALLBACK_PATH,
  TRIANGLE_OUTLINE_COLOR,
  TRIANGLE_SHAPE_CONFIG,
  TRIANGLE_TOTAL_DEPTH,
  TRIANGLE_WORLD_POSITION,
  calculateContinuousPose,
  calculateCoverFrustum,
  calculateTriangleGuide,
  createMotionProfile,
  createTriangleObject,
  createTriangleShape,
} from '../triangle3d';

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function triangleArea(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
}

describe('triangle3d scene model', () => {
  it('exposes developer-friendly defaults with a small initial-view compensation', () => {
    expect(TRIANGLE_SHAPE_CONFIG).toEqual({
      sideLength: 112,
      heightScale: 1.03,
      tipSkew: 0,
      notchDepth: 22,
      cornerRadius: 10,
    });

    const guide = calculateTriangleGuide({ ...TRIANGLE_SHAPE_CONFIG, heightScale: 1 });
    const sides = [
      distance(guide.tip, guide.bottomRight),
      distance(guide.bottomRight, guide.bottomLeft),
      distance(guide.bottomLeft, guide.tip),
    ];

    sides.forEach((side) => expect(side).toBeCloseTo(TRIANGLE_SHAPE_CONFIG.sideLength, 6));
  });

  it('projects the tuned default guide as near-equilateral at the initial 3d pose', () => {
    const guide = calculateTriangleGuide();
    const rotation = new Euler(STATIC_ROTATION.x, STATIC_ROTATION.y, STATIC_ROTATION.z, 'XYZ');
    const projected = [guide.tip, guide.bottomRight, guide.bottomLeft].map((point) => new Vector3(point.x, -point.y, 0).applyEuler(rotation));
    const projectedDistance = (a: Vector3, b: Vector3) => Math.hypot(b.x - a.x, b.y - a.y);
    const sides = [
      projectedDistance(projected[0]!, projected[1]!),
      projectedDistance(projected[1]!, projected[2]!),
      projectedDistance(projected[2]!, projected[0]!),
    ];

    expect(Math.max(...sides) / Math.min(...sides)).toBeLessThan(1.005);
  });

  it('lets height and skew tune the triangle without editing path coordinates', () => {
    const defaultGuide = calculateTriangleGuide();
    const flatterGuide = calculateTriangleGuide({ ...TRIANGLE_SHAPE_CONFIG, heightScale: 0.8 });
    const skewedGuide = calculateTriangleGuide({ ...TRIANGLE_SHAPE_CONFIG, tipSkew: 12 });

    expect(distance(flatterGuide.bottomRight, flatterGuide.bottomLeft)).toBeCloseTo(TRIANGLE_SHAPE_CONFIG.sideLength, 6);
    expect(triangleArea(flatterGuide.tip, flatterGuide.bottomRight, flatterGuide.bottomLeft)).toBeLessThan(
      triangleArea(defaultGuide.tip, defaultGuide.bottomRight, defaultGuide.bottomLeft),
    );
    expect(distance(skewedGuide.tip, skewedGuide.bottomRight)).not.toBeCloseTo(distance(skewedGuide.tip, skewedGuide.bottomLeft), 4);
  });

  it('moves the concave notch toward the tip by the configured depth', () => {
    const guide = calculateTriangleGuide();
    const baseMidpoint = {
      x: (guide.bottomRight.x + guide.bottomLeft.x) / 2,
      y: (guide.bottomRight.y + guide.bottomLeft.y) / 2,
    };

    expect(distance(baseMidpoint, guide.notch)).toBeCloseTo(TRIANGLE_SHAPE_CONFIG.notchDepth, 6);
  });

  it('builds a near-front rounded navigation arrow as a visible shallow prism', () => {
    const object = createTriangleObject();
    const bounds = new Box3().setFromObject(object.group);
    const size = bounds.getSize(new Vector3());

    expect(size.x).toBeGreaterThanOrEqual(100);
    expect(size.y).toBeGreaterThanOrEqual(90);
    expect(size.z).toBeCloseTo(TRIANGLE_TOTAL_DEPTH, 4);
    expect(TRIANGLE_TOTAL_DEPTH).toBe(24);
    expect(MathUtils.radToDeg(STATIC_ROTATION.x)).toBeCloseTo(8, 6);
    expect(MathUtils.radToDeg(STATIC_ROTATION.y)).toBeCloseTo(-12, 6);
    expect(MathUtils.radToDeg(STATIC_ROTATION.z)).toBeCloseTo(0, 6);
    expect(TRIANGLE_WORLD_POSITION).toEqual({ x: -482.5, y: -130, z: 0 });

    object.dispose();
  });

  it('uses one safely rounded, concave up-right contour', () => {
    const points = createTriangleShape().getPoints(32);
    const turnSigns = points
      .map((point, index) => {
        const previous = points[(index - 1 + points.length) % points.length]!;
        const next = points[(index + 1) % points.length]!;
        const cross = (point.x - previous.x) * (next.y - point.y) - (point.y - previous.y) * (next.x - point.x);
        return Math.abs(cross) > 0.01 ? Math.sign(cross) : 0;
      })
      .filter((sign) => sign !== 0);

    expect(TRIANGLE_FALLBACK_PATH.match(/Q/g)?.length).toBe(4);
    expect(new Set(turnSigns)).toEqual(new Set([-1, 1]));
    expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });

  it('caps oversized corner radii before they can fold the path', () => {
    const shape = createTriangleShape({ ...TRIANGLE_SHAPE_CONFIG, cornerRadius: 1_000 });
    const points = shape.getPoints(32);
    const defaultPoints = createTriangleShape().getPoints(32);

    expect(points.length).toBeGreaterThan(20);
    expect(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    expect(points).not.toEqual(defaultPoints);
  });

  it('outlines both prism caps without protruding depth connectors', () => {
    const object = createTriangleObject();
    const outline = object.group.children.find((child) => child instanceof LineSegments2);
    outline?.geometry.computeBoundingBox();
    const outlineSize = outline?.geometry.boundingBox?.getSize(new Vector3());

    expect(object.outlineMaterial.linewidth).toBe(1);
    expect(object.outlineMaterial.opacity).toBe(0.42);
    expect(object.outlineMaterial.color.getHexString()).toBe(new Color(TRIANGLE_OUTLINE_COLOR).getHexString());
    expect(outline?.geometry.getAttribute('instanceStart')?.count).toBeGreaterThan(40);
    expect(outlineSize?.x).toBeGreaterThan(100);
    expect(outlineSize?.y).toBeGreaterThan(90);
    expect(outlineSize?.z).toBeCloseTo(TRIANGLE_TOTAL_DEPTH, 4);

    const starts = outline?.geometry.getAttribute('instanceStart');
    const ends = outline?.geometry.getAttribute('instanceEnd');
    for (let index = 0; index < (starts?.count ?? 0); index += 1) {
      expect(starts?.getZ(index)).toBeCloseTo(ends?.getZ(index) ?? Number.NaN, 4);
    }

    const mesh = object.group.children.find((child) => child instanceof Mesh);
    const materials = Array.isArray(mesh?.material) ? mesh.material : [];
    expect(materials[0]?.color.getHexString()).toBe(new Color(TRIANGLE_BODY_COLOR).getHexString());
    expect(materials[1]?.color.getHexString()).toBe(new Color(TRIANGLE_BODY_COLOR).getHexString());
    expect(materials[0]?.opacity).toBeLessThanOrEqual(0.32);
    expect(materials[1]?.opacity).toBeGreaterThanOrEqual(0.24);
    expect(materials[1]?.opacity).toBeLessThanOrEqual(0.3);

    object.dispose();
  });

  it('disposes every owned GPU resource', () => {
    const object = createTriangleObject();
    const mesh = object.group.children.find((child) => child instanceof Mesh);
    const outline = object.group.children.find((child) => child instanceof LineSegments2);
    const resources = [mesh?.geometry, ...(Array.isArray(mesh?.material) ? mesh.material : []), outline?.geometry, outline?.material];
    const disposeSpies = resources.filter((resource) => resource !== undefined).map((resource) => vi.spyOn(resource, 'dispose'));

    object.dispose();

    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });

  it.each([
    [1400, 800, { left: -700, right: 700, top: 400, bottom: -400 }],
    [1440, 900, { left: -640, right: 640, top: 400, bottom: -400 }],
  ])('matches center/cover framing at %d×%d', (width, height, expected) => {
    expect(calculateCoverFrustum(width, height)).toEqual(expected);
  });

  it('restores the original large circular route as a seamless orbit', () => {
    const profile = createMotionProfile(() => 0.5);
    const start = calculateContinuousPose(0, profile);
    const formerSvgEndpoint = calculateContinuousPose(25_000, profile);
    const fullOrbit = calculateContinuousPose(ORBIT_DURATION_MS, profile);

    expect(start.position).toEqual(TRIANGLE_WORLD_POSITION);
    expect(formerSvgEndpoint.position.x).toBeLessThan(-750);
    expect(formerSvgEndpoint.position.y).toBeGreaterThan(110);
    expect(fullOrbit.position.x).toBeCloseTo(start.position.x, 6);
    expect(fullOrbit.position.y).toBeCloseTo(start.position.y, 6);
  });

  it('keeps independent non-zero 3d spin velocities through every frame', () => {
    const profile = createMotionProfile(() => 0.5);
    const before = calculateContinuousPose(28_000, profile);
    const after = calculateContinuousPose(28_001, profile);
    const later = calculateContinuousPose(88_000, profile);

    expect(Math.abs(profile.spinXRadiansPerMs)).toBeGreaterThan(0);
    expect(Math.abs(profile.spinYRadiansPerMs)).toBeGreaterThan(0);
    expect(Math.abs(profile.spinZRadiansPerMs)).toBeGreaterThan(0);
    expect(MathUtils.radToDeg(Math.abs(profile.spinXRadiansPerMs)) * 1000).toBeGreaterThanOrEqual(7);
    expect(MathUtils.radToDeg(Math.abs(profile.spinYRadiansPerMs)) * 1000).toBeGreaterThanOrEqual(10);
    expect(MathUtils.radToDeg(Math.abs(profile.spinZRadiansPerMs)) * 1000).toBeGreaterThanOrEqual(4);
    expect(Math.abs(after.rotation.x - before.rotation.x)).toBeGreaterThan(0);
    expect(Math.abs(after.rotation.y - before.rotation.y)).toBeGreaterThan(0);
    expect(Math.abs(after.rotation.z - before.rotation.z)).toBeGreaterThan(0);
    expect(Math.abs(later.rotation.x - STATIC_ROTATION.x)).toBeGreaterThan(Math.PI);
    expect(Math.abs(later.rotation.y - STATIC_ROTATION.y)).toBeGreaterThan(Math.PI);
  });
});
