import { Euler, ExtrudeGeometry, Group, MathUtils, Mesh, MeshStandardMaterial, Quaternion, Shape } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

export const SVG_VIEWBOX = { width: 1400, height: 800 } as const;
export const TRIANGLE_TOTAL_DEPTH = 14;
export const TRIANGLE_WORLD_POSITION = { x: -482.5, y: -130, z: 0 } as const;
export const STATIC_ROTATION = {
  x: MathUtils.degToRad(12),
  y: MathUtils.degToRad(-18),
  z: MathUtils.degToRad(8),
} as const;

const TRIANGLE_CENTER = { x: 217.5, y: 530 } as const;
const BEVEL_SIZE = 3;
const CORE_DEPTH = TRIANGLE_TOTAL_DEPTH - BEVEL_SIZE * 2;

export interface CoverFrustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface RotationTarget {
  quaternion: Quaternion;
  durationMs: number;
  zRadians: number;
  deltaZDegrees: number;
  eulerDegrees: { x: number; y: number; z: number };
}

export interface TriangleObject {
  group: Group;
  outlineMaterial: LineMaterial;
  dispose: () => void;
}

function localPoint(x: number, y: number): [number, number] {
  return [x - TRIANGLE_CENTER.x, TRIANGLE_CENTER.y - y];
}

function createTriangleShape() {
  const shape = new Shape();
  shape.moveTo(...localPoint(165, 580));
  shape.lineTo(...localPoint(270, 580));
  shape.quadraticCurveTo(...localPoint(275, 578), ...localPoint(270, 570));
  shape.lineTo(...localPoint(223, 483));
  shape.quadraticCurveTo(...localPoint(220, 480), ...localPoint(217, 483));
  shape.lineTo(...localPoint(165, 570));
  shape.quadraticCurveTo(...localPoint(160, 578), ...localPoint(165, 580));
  return shape;
}

type Position = [x: number, y: number, z: number];

function positionKey([x, y, z]: Position) {
  return `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
}

function createOutlinePositions(geometry: ExtrudeGeometry) {
  const position = geometry.getAttribute('position');
  const zLevels = new Map<string, number>();
  for (let index = 0; index < position.count; index += 1) {
    const z = position.getZ(index);
    zLevels.set(z.toFixed(4), z);
  }
  const sortedZLevels = [...zLevels.values()].sort((a, b) => a - b);
  const capLevels = [sortedZLevels[0], sortedZLevels.at(-1)].filter((z): z is number => z !== undefined);
  const positions: number[] = [];

  for (const capZ of capLevels) {
    const edges = new Map<string, { count: number; end: Position; start: Position }>();
    for (let index = 0; index < position.count; index += 3) {
      const triangle: Position[] = [0, 1, 2].map((offset) => [position.getX(index + offset), position.getY(index + offset), position.getZ(index + offset)]);
      if (!triangle.every((point) => Math.abs(point[2] - capZ) < 0.0001)) continue;

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

  const depthDirections = [
    [-1, -1],
    [1, -1],
    [0, 1],
  ] as const;
  for (const [directionX, directionY] of depthDirections) {
    const depthPath = sortedZLevels.map((z) => {
      let best: Position | undefined;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (let index = 0; index < position.count; index += 1) {
        if (Math.abs(position.getZ(index) - z) >= 0.0001) continue;
        const candidate: Position = [position.getX(index), position.getY(index), z];
        const score = candidate[0] * directionX + candidate[1] * directionY;
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
      return best;
    });
    for (let index = 1; index < depthPath.length; index += 1) {
      const start = depthPath[index - 1];
      const end = depthPath[index];
      if (start && end) positions.push(...start, ...end);
    }
  }

  return positions;
}

export function createTriangleObject(): TriangleObject {
  const geometry = new ExtrudeGeometry(createTriangleShape(), {
    depth: CORE_DEPTH,
    bevelEnabled: true,
    bevelSize: BEVEL_SIZE,
    bevelThickness: BEVEL_SIZE,
    bevelSegments: 4,
    curveSegments: 16,
    steps: 1,
  });
  geometry.translate(0, 0, -CORE_DEPTH / 2);

  const capMaterial = new MeshStandardMaterial({
    color: '#f3b2ac',
    metalness: 0,
    opacity: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    roughness: 0.95,
    transparent: true,
  });
  const sideMaterial = new MeshStandardMaterial({
    color: '#e99289',
    metalness: 0,
    opacity: 0.58,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    roughness: 0.95,
    transparent: true,
  });
  const mesh = new Mesh(geometry, [capMaterial, sideMaterial]);

  const lineGeometry = new LineSegmentsGeometry();
  lineGeometry.setPositions(createOutlinePositions(geometry));
  const outlineMaterial = new LineMaterial({
    color: '#ee675c',
    linewidth: 1.5,
    opacity: 0.8,
    transparent: true,
    worldUnits: false,
  });
  const outline = new LineSegments2(lineGeometry, outlineMaterial);

  const group = new Group();
  group.position.set(TRIANGLE_WORLD_POSITION.x, TRIANGLE_WORLD_POSITION.y, TRIANGLE_WORLD_POSITION.z);
  group.add(mesh, outline);

  const disposables = [geometry, capMaterial, sideMaterial, lineGeometry, outlineMaterial];
  return {
    group,
    outlineMaterial,
    dispose: () => disposables.forEach((resource) => resource.dispose()),
  };
}

export function calculateCoverFrustum(width: number, height: number): CoverFrustum {
  const scale = Math.max(width / SVG_VIEWBOX.width, height / SVG_VIEWBOX.height);
  const visibleWidth = width / scale;
  const visibleHeight = height / scale;
  return {
    left: -visibleWidth / 2,
    right: visibleWidth / 2,
    top: visibleHeight / 2,
    bottom: -visibleHeight / 2,
  };
}

function randomInRange(random: () => number, min: number, max: number) {
  return min + (max - min) * Math.min(1, Math.max(0, random()));
}

export function createRandomRotationTarget(currentZRadians: number, random: () => number = Math.random): RotationTarget {
  let x = randomInRange(random, -35, 35);
  let y = randomInRange(random, -35, 35);
  if (Math.max(Math.abs(x), Math.abs(y)) < 12) {
    if (random() < 0.5) x = x < 0 ? -12 : 12;
    else y = y < 0 ? -12 : 12;
  }

  const direction = random() < 0.5 ? -1 : 1;
  const deltaZDegrees = direction * randomInRange(random, 35, 110);
  const zRadians = currentZRadians + MathUtils.degToRad(deltaZDegrees);
  const euler = new Euler(MathUtils.degToRad(x), MathUtils.degToRad(y), zRadians, 'XYZ');

  return {
    quaternion: new Quaternion().setFromEuler(euler),
    durationMs: randomInRange(random, 18_000, 28_000),
    zRadians,
    deltaZDegrees,
    eulerDegrees: { x, y, z: MathUtils.radToDeg(zRadians) },
  };
}

export function easeInOutQuint(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
}
