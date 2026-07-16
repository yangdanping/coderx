import { ExtrudeGeometry, Group, MathUtils, Mesh, MeshStandardMaterial, Shape } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import {
  GLOBAL_BACKGROUND_CONFIG,
  GLOBAL_SHAPE_DESCRIPTORS,
  type GlobalGeometryConfig,
  type GlobalRenderingProfile,
  type GlobalShapeDescriptor,
  type GlobalShapeId,
} from '../config';

export interface GlobalBackgroundObject {
  id: GlobalShapeId;
  group: Group;
  outlineMaterial: LineMaterial;
  dispose(): void;
}

export interface CoverFrustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface GlobalBackgroundPose {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

type Disposable = { dispose(): void };
type Position = [x: number, y: number, z: number];

function assertPositiveFinite(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`[global-background3d] ${name} must be finite and greater than zero`);
  }
}

function validateDescriptor(descriptor: GlobalShapeDescriptor) {
  assertPositiveFinite('depth', descriptor.depth);
  const geometry = descriptor.geometry;
  if (geometry.kind === 'circle') {
    assertPositiveFinite('diameter', geometry.diameter);
    return;
  }
  assertPositiveFinite('width', geometry.width);
  assertPositiveFinite('height', geometry.kind === 'rounded-rect' ? geometry.height : geometry.arcHeight + geometry.baseHeight);
}

function createRoundedRectShape(width: number, height: number, radius: number) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const safeRadius = Math.min(Math.max(0, radius), halfWidth, halfHeight);
  const shape = new Shape();

  shape.moveTo(-halfWidth + safeRadius, -halfHeight);
  shape.lineTo(halfWidth - safeRadius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + safeRadius);
  shape.lineTo(halfWidth, halfHeight - safeRadius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - safeRadius, halfHeight);
  shape.lineTo(-halfWidth + safeRadius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - safeRadius);
  shape.lineTo(-halfWidth, -halfHeight + safeRadius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + safeRadius, -halfHeight);
  shape.closePath();
  return shape;
}

function createArchShape(width: number, arcHeight: number, baseHeight: number, baseRadius: number) {
  const halfWidth = width / 2;
  const totalHeight = arcHeight + baseHeight;
  const bottom = -totalHeight / 2;
  const arcBase = bottom + baseHeight;
  const safeRadius = Math.min(Math.max(0, baseRadius), halfWidth, baseHeight);
  const shape = new Shape();

  shape.moveTo(-halfWidth + safeRadius, bottom);
  shape.lineTo(halfWidth - safeRadius, bottom);
  shape.quadraticCurveTo(halfWidth, bottom, halfWidth, bottom + safeRadius);
  shape.lineTo(halfWidth, arcBase);
  shape.absellipse(0, arcBase, halfWidth, arcHeight, 0, Math.PI, false, 0);
  shape.lineTo(-halfWidth, bottom + safeRadius);
  shape.quadraticCurveTo(-halfWidth, bottom, -halfWidth + safeRadius, bottom);
  shape.closePath();
  return shape;
}

function createShape(config: GlobalGeometryConfig) {
  if (config.kind === 'circle') {
    const shape = new Shape();
    shape.absarc(0, 0, config.diameter / 2, 0, Math.PI * 2, false);
    return shape;
  }
  if (config.kind === 'rounded-rect') {
    return createRoundedRectShape(config.width, config.height, config.radius);
  }
  return createArchShape(config.width, config.arcHeight, config.baseHeight, config.baseRadius);
}

function positionKey([x, y, z]: Position) {
  return `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
}

function createOutlinePositions(geometry: ExtrudeGeometry) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) throw new Error('[global-background3d] extrusion has no bounding box for outlines');
  const position = geometry.getAttribute('position');
  const positions: number[] = [];

  for (const capZ of [bounds.min.z, bounds.max.z]) {
    const edges = new Map<string, { count: number; start: Position; end: Position }>();
    for (let index = 0; index < position.count; index += 3) {
      const triangle: Position[] = [0, 1, 2].map((offset) => [
        position.getX(index + offset),
        position.getY(index + offset),
        position.getZ(index + offset),
      ]);
      if (!triangle.every((point) => Math.abs(point[2] - capZ) < 0.00001)) continue;

      for (const [startIndex, endIndex] of [
        [0, 1],
        [1, 2],
        [2, 0],
      ] as const) {
        const start = triangle[startIndex]!;
        const end = triangle[endIndex]!;
        const key = [positionKey(start), positionKey(end)].sort().join('|');
        const edge = edges.get(key);
        if (edge) edge.count += 1;
        else edges.set(key, { count: 1, start, end });
      }
    }
    edges.forEach((edge) => {
      if (edge.count === 1) positions.push(...edge.start, ...edge.end);
    });
  }

  return positions;
}

function centerGeometry(geometry: ExtrudeGeometry) {
  const position = geometry.getAttribute('position');
  if (position.count === 0) throw new Error('[global-background3d] extrusion did not produce vertices');
  for (let index = 0; index < position.count; index += 1) {
    if (![position.getX(index), position.getY(index), position.getZ(index)].every(Number.isFinite)) {
      throw new Error('[global-background3d] extrusion produced non-finite vertices');
    }
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) throw new Error('[global-background3d] extrusion has no bounding box');
  geometry.translate(-(bounds.min.x + bounds.max.x) / 2, -(bounds.min.y + bounds.max.y) / 2, -(bounds.min.z + bounds.max.z) / 2);
  geometry.computeBoundingBox();
}

export function createGlobalBackgroundObject(descriptor: GlobalShapeDescriptor): GlobalBackgroundObject {
  validateDescriptor(descriptor);
  const disposables: Disposable[] = [];

  try {
    const geometry = new ExtrudeGeometry(createShape(descriptor.geometry), {
      bevelEnabled: false,
      curveSegments: 16,
      depth: descriptor.depth,
      steps: 1,
    });
    disposables.push(geometry);
    centerGeometry(geometry);

    const { material } = GLOBAL_BACKGROUND_CONFIG;
    const capMaterial = new MeshStandardMaterial({
      color: descriptor.color,
      metalness: material.metalness,
      opacity: material.capOpacity * descriptor.opacity,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      roughness: material.roughness,
      transparent: true,
    });
    disposables.push(capMaterial);
    const sideMaterial = new MeshStandardMaterial({
      color: descriptor.color,
      metalness: material.metalness,
      opacity: material.sideOpacity * descriptor.opacity,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      roughness: material.roughness,
      transparent: true,
    });
    disposables.push(sideMaterial);
    const mesh = new Mesh(geometry, [capMaterial, sideMaterial]);

    const lineGeometry = new LineSegmentsGeometry();
    disposables.push(lineGeometry);
    lineGeometry.setPositions(createOutlinePositions(geometry));
    const outlineMaterial = new LineMaterial({
      color: descriptor.color,
      linewidth: material.outlineWidth,
      opacity: material.outlineOpacity * descriptor.opacity,
      transparent: true,
      worldUnits: false,
    });
    disposables.push(outlineMaterial);
    const outline = new LineSegments2(lineGeometry, outlineMaterial);

    const group = new Group();
    group.position.set(...descriptor.position);
    group.rotation.set(...descriptor.rotationDegrees.map(MathUtils.degToRad), 'XYZ');
    group.add(mesh, outline);

    let disposed = false;
    return {
      id: descriptor.id,
      group,
      outlineMaterial,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        disposables.forEach((resource) => resource.dispose());
      },
    };
  } catch (error) {
    disposables.reverse().forEach((resource) => resource.dispose());
    throw error;
  }
}

export function createGlobalBackgroundObjects(): GlobalBackgroundObject[] {
  const objects: GlobalBackgroundObject[] = [];
  try {
    GLOBAL_SHAPE_DESCRIPTORS.forEach((descriptor) => objects.push(createGlobalBackgroundObject(descriptor)));
    return objects;
  } catch (error) {
    objects.reverse().forEach((object) => object.dispose());
    throw error;
  }
}

export function calculateCoverFrustum(width: number, height: number): CoverFrustum {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const { viewBox } = GLOBAL_BACKGROUND_CONFIG;
  const scale = Math.max(safeWidth / viewBox.width, safeHeight / viewBox.height);
  const visibleWidth = safeWidth / scale;
  const visibleHeight = safeHeight / scale;
  return {
    left: -visibleWidth / 2,
    right: visibleWidth / 2,
    top: visibleHeight / 2,
    bottom: -visibleHeight / 2,
  };
}

export function getGlobalRenderingProfile(width: number): GlobalRenderingProfile {
  return width <= GLOBAL_BACKGROUND_CONFIG.narrowMaxWidth ? GLOBAL_BACKGROUND_CONFIG.narrow : GLOBAL_BACKGROUND_CONFIG.desktop;
}

function initialRotation(descriptor: GlobalShapeDescriptor) {
  return descriptor.rotationDegrees.map((degrees) => MathUtils.degToRad(degrees)) as [number, number, number];
}

export function calculateGlobalBackgroundPose(
  descriptor: GlobalShapeDescriptor,
  elapsedMs: number,
  viewportWidth: number,
  reducedMotion = false,
): GlobalBackgroundPose {
  const basePosition = descriptor.position;
  const baseRotation = initialRotation(descriptor);
  if (reducedMotion) {
    return {
      position: { x: basePosition[0], y: basePosition[1], z: basePosition[2] },
      rotation: { x: baseRotation[0], y: baseRotation[1], z: baseRotation[2] },
    };
  }

  const elapsed = Math.max(0, elapsedMs);
  if (descriptor.motion.tier === 'spin') {
    const progress = elapsed / descriptor.motion.durationMs;
    return {
      position: { x: basePosition[0], y: basePosition[1], z: basePosition[2] },
      rotation: {
        x: baseRotation[0] + progress * Math.PI * 2 * descriptor.motion.turns[0],
        y: baseRotation[1] + progress * Math.PI * 2 * descriptor.motion.turns[1],
        z: baseRotation[2] + progress * Math.PI * 2 * descriptor.motion.turns[2],
      },
    };
  }

  const profile = getGlobalRenderingProfile(viewportWidth);
  const phase = (elapsed / descriptor.motion.durationMs) * Math.PI * 2 + descriptor.motion.phase;
  return {
    position: {
      x: basePosition[0] + Math.sin(phase) * descriptor.motion.travel[0] * profile.motionScale,
      y: basePosition[1] + Math.cos(phase) * descriptor.motion.travel[1] * profile.motionScale,
      z: basePosition[2],
    },
    rotation: {
      x: baseRotation[0] + MathUtils.degToRad(Math.sin(phase) * descriptor.motion.tiltDegrees[0] * profile.tiltScale),
      y: baseRotation[1] + MathUtils.degToRad(Math.cos(phase) * descriptor.motion.tiltDegrees[1] * profile.tiltScale),
      z: baseRotation[2] + MathUtils.degToRad(Math.sin(phase * 0.5) * descriptor.motion.tiltDegrees[2] * profile.tiltScale),
    },
  };
}
