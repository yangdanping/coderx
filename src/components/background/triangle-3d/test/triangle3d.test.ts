import { Box3, MathUtils, Mesh, Vector3 } from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { describe, expect, it, vi } from 'vitest';
import {
  ORBIT_DURATION_MS,
  STATIC_ROTATION,
  TRIANGLE_TOTAL_DEPTH,
  TRIANGLE_WORLD_POSITION,
  calculateContinuousPose,
  calculateCoverFrustum,
  createMotionProfile,
  createTriangleObject,
} from '../triangle3d';

describe('triangle3d scene model', () => {
  it('builds the original rounded silhouette as a visible shallow prism', () => {
    const object = createTriangleObject();
    const bounds = new Box3().setFromObject(object.group);
    const size = bounds.getSize(new Vector3());

    expect(size.x).toBeGreaterThanOrEqual(110);
    expect(size.y).toBeGreaterThanOrEqual(96);
    expect(size.z).toBeCloseTo(TRIANGLE_TOTAL_DEPTH, 4);
    expect(TRIANGLE_TOTAL_DEPTH).toBeGreaterThanOrEqual(22);
    expect(TRIANGLE_TOTAL_DEPTH).toBeLessThanOrEqual(28);
    expect(Math.abs(MathUtils.radToDeg(STATIC_ROTATION.x))).toBeGreaterThanOrEqual(16);
    expect(Math.abs(MathUtils.radToDeg(STATIC_ROTATION.y))).toBeGreaterThanOrEqual(22);
    expect(TRIANGLE_WORLD_POSITION).toEqual({ x: -482.5, y: -130, z: 0 });

    object.dispose();
  });

  it('outlines both prism caps without protruding depth connectors', () => {
    const object = createTriangleObject();
    const outline = object.group.children.find((child) => child instanceof LineSegments2);
    outline?.geometry.computeBoundingBox();
    const outlineSize = outline?.geometry.boundingBox?.getSize(new Vector3());

    expect(object.outlineMaterial.linewidth).toBeLessThanOrEqual(1.25);
    expect(object.outlineMaterial.opacity).toBeLessThanOrEqual(0.65);
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
