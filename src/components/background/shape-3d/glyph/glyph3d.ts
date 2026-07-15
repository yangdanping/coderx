import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { GLYPH_3D_CONFIG, type Glyph3DConfig } from '../config';
import { createGlyphShapes } from './glyph3d-outline';

export { createGlyphShapes, getGlyphFallback } from './glyph3d-outline';
export type { GlyphFallbackDescriptor } from './glyph3d-outline';

export interface GlyphObject {
  group: Group;
  outlineMaterial: LineMaterial;
  dispose: () => void;
}

type Disposable = { dispose: () => void };
type Position = [x: number, y: number, z: number];

function assertPositiveFinite(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`[glyph3d] ${name} must be finite and greater than zero`);
  }
}

function validateConfig(config: Glyph3DConfig) {
  assertPositiveFinite('targetHeight', config.targetHeight);
  assertPositiveFinite('depth', config.depth);
  assertPositiveFinite('curveSegments', config.curveSegments);
}

function positionKey([x, y, z]: Position) {
  return `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
}

function createOutlinePositions(geometry: ExtrudeGeometry) {
  const position = geometry.getAttribute('position');
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) throw new Error('[glyph3d] extrusion has no bounding box for outlines');
  const capLevels = [bounds.min.z, bounds.max.z];
  const positions: number[] = [];

  for (const capZ of capLevels) {
    const edges = new Map<string, { count: number; end: Position; start: Position }>();
    for (let index = 0; index < position.count; index += 3) {
      const triangle: Position[] = [0, 1, 2].map((offset) => [
        position.getX(index + offset),
        position.getY(index + offset),
        position.getZ(index + offset),
      ]);
      if (!triangle.every((point) => point[2] === capZ)) continue;

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
        else edges.set(key, { count: 1, end, start });
      }
    }
    edges.forEach((edge) => {
      if (edge.count === 1) positions.push(...edge.start, ...edge.end);
    });
  }

  return positions;
}

function normalizeGeometry(geometry: ExtrudeGeometry, config: Glyph3DConfig) {
  const position = geometry.getAttribute('position');
  if (position.count === 0) throw new Error('[glyph3d] extrusion did not produce any vertices');
  for (let index = 0; index < position.count; index += 1) {
    if (![position.getX(index), position.getY(index), position.getZ(index)].every(Number.isFinite)) {
      throw new Error('[glyph3d] extrusion produced non-finite vertices');
    }
  }

  geometry.computeBoundingBox();
  const initial = geometry.boundingBox;
  if (!initial) throw new Error('[glyph3d] extrusion has no bounding box');
  const height = initial.max.y - initial.min.y;
  assertPositiveFinite('outline height', height);
  const xyScale = config.targetHeight / height;
  geometry.scale(xyScale, xyScale, 1);

  geometry.computeBoundingBox();
  const scaled = geometry.boundingBox;
  if (!scaled) throw new Error('[glyph3d] scaled extrusion has no bounding box');
  geometry.translate(
    -(scaled.min.x + scaled.max.x) / 2,
    -(scaled.min.y + scaled.max.y) / 2,
    -(scaled.min.z + scaled.max.z) / 2,
  );
  geometry.computeBoundingBox();
}

export function createGlyphObject(config: Glyph3DConfig = GLYPH_3D_CONFIG): GlyphObject {
  validateConfig(config);
  const disposables: Disposable[] = [];

  try {
    const geometry = new ExtrudeGeometry(createGlyphShapes(config.outlineStyle), {
      bevelEnabled: false,
      curveSegments: config.curveSegments,
      depth: config.depth,
      steps: 1,
    });
    disposables.push(geometry);
    normalizeGeometry(geometry, config);

    const capMaterial = new MeshStandardMaterial({
      color: config.bodyColor,
      metalness: config.metalness,
      opacity: config.capOpacity,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      roughness: config.roughness,
      transparent: true,
    });
    disposables.push(capMaterial);
    const sideMaterial = new MeshStandardMaterial({
      color: config.bodyColor,
      metalness: config.metalness,
      opacity: config.sideOpacity,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      roughness: config.roughness,
      transparent: true,
    });
    disposables.push(sideMaterial);
    const mesh = new Mesh(geometry, [capMaterial, sideMaterial]);

    const lineGeometry = new LineSegmentsGeometry();
    disposables.push(lineGeometry);
    lineGeometry.setPositions(createOutlinePositions(geometry));
    const outlineMaterial = new LineMaterial({
      color: config.outlineColor,
      linewidth: config.outlineWidth,
      opacity: config.outlineOpacity,
      transparent: true,
      worldUnits: false,
    });
    disposables.push(outlineMaterial);
    const outline = new LineSegments2(lineGeometry, outlineMaterial);

    const group = new Group();
    // SVG coordinates point downward; a group-level mirror keeps triangle winding/material faces intact.
    group.scale.y = -1;
    group.add(mesh, outline);

    let disposed = false;
    return {
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
