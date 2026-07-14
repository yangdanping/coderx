import { ExtrudeGeometry, Group, MathUtils, Mesh, MeshStandardMaterial, Shape } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

export const SVG_VIEWBOX = { width: 1400, height: 800 } as const;
export const TRIANGLE_TOTAL_DEPTH = 24;
export const TRIANGLE_BODY_COLOR = '#f8cbc6';
export const TRIANGLE_OUTLINE_COLOR = '#f7aaa3';
export const TRIANGLE_WORLD_POSITION = { x: -482.5, y: -130, z: 0 } as const;
export const ORBIT_DURATION_MS = 56_250;
export const STATIC_ROTATION = {
  x: MathUtils.degToRad(8),
  y: MathUtils.degToRad(-12),
  z: 0,
} as const;

const TRIANGLE_CENTER = { x: 217.5, y: 530 } as const;
const ORBIT_CENTER = { x: -600, y: 20 } as const;
const ORBIT_OFFSET = {
  x: TRIANGLE_WORLD_POSITION.x - ORBIT_CENTER.x,
  y: TRIANGLE_WORLD_POSITION.y - ORBIT_CENTER.y,
} as const;
const BEVEL_SIZE = 0;
const CORE_DEPTH = TRIANGLE_TOTAL_DEPTH - BEVEL_SIZE * 2;

type PathPoint = readonly [x: number, y: number];
type TrianglePathCommand =
  | { type: 'M' | 'L'; point: PathPoint }
  | { type: 'C'; control1: PathPoint; control2: PathPoint; point: PathPoint }
  | { type: 'Z' };

const TRIANGLE_ARROW_PATH: readonly TrianglePathCommand[] = [
  { type: 'M', point: [258, 483] },
  { type: 'C', control1: [268, 479], control2: [278, 483], point: [274, 493] },
  { type: 'L', point: [241, 571] },
  { type: 'C', control1: [237, 581], control2: [234, 584], point: [229, 583] },
  { type: 'C', control1: [224, 583], control2: [221, 580], point: [218, 575] },
  { type: 'L', point: [204, 552] },
  { type: 'C', control1: [202, 549], control2: [200, 548], point: [196, 547] },
  { type: 'L', point: [169, 538] },
  { type: 'C', control1: [160, 535], control2: [156, 530], point: [157, 524] },
  { type: 'C', control1: [158, 518], control2: [162, 515], point: [169, 513] },
  { type: 'L', point: [258, 483] },
  { type: 'Z' },
];

export interface CoverFrustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface MotionProfile {
  spinXRadiansPerMs: number;
  spinYRadiansPerMs: number;
  spinZRadiansPerMs: number;
}

export interface ContinuousPose {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export interface TriangleObject {
  group: Group;
  outlineMaterial: LineMaterial;
  dispose: () => void;
}

function localPoint(x: number, y: number): [number, number] {
  return [x - TRIANGLE_CENTER.x, TRIANGLE_CENTER.y - y];
}

function localPathPoint([x, y]: PathPoint): [number, number] {
  return localPoint(x, y);
}

function pointText([x, y]: PathPoint) {
  return `${x} ${y}`;
}

export const TRIANGLE_FALLBACK_PATH = TRIANGLE_ARROW_PATH.map((command) => {
  if (command.type === 'Z') return 'Z';
  if (command.type === 'C') {
    return `C ${pointText(command.control1)} ${pointText(command.control2)} ${pointText(command.point)}`;
  }
  return `${command.type} ${pointText(command.point)}`;
}).join(' ');

export function createTriangleShape() {
  const shape = new Shape();

  for (const command of TRIANGLE_ARROW_PATH) {
    if (command.type === 'Z') {
      shape.closePath();
      continue;
    }

    const point = localPathPoint(command.point);
    if (command.type === 'M') shape.moveTo(...point);
    else if (command.type === 'L') shape.lineTo(...point);
    else shape.bezierCurveTo(...localPathPoint(command.control1), ...localPathPoint(command.control2), ...point);
  }

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
  const capLevels = [sortedZLevels.at(0), sortedZLevels.at(-1)].filter(
    (z, index, levels): z is number => z !== undefined && levels.indexOf(z) === index,
  );
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

  return positions;
}

export function createTriangleObject(): TriangleObject {
  const geometry = new ExtrudeGeometry(createTriangleShape(), {
    depth: CORE_DEPTH,
    bevelEnabled: false,
    bevelSize: BEVEL_SIZE,
    bevelThickness: BEVEL_SIZE,
    bevelSegments: 4,
    curveSegments: 16,
    steps: 1,
  });
  geometry.translate(0, 0, -CORE_DEPTH / 2);

  const capMaterial = new MeshStandardMaterial({
    color: TRIANGLE_BODY_COLOR,
    metalness: 0,
    opacity: 0.28,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    roughness: 0.95,
    transparent: true,
  });
  const sideMaterial = new MeshStandardMaterial({
    color: TRIANGLE_BODY_COLOR,
    metalness: 0,
    opacity: 0.26,
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
    color: TRIANGLE_OUTLINE_COLOR,
    linewidth: 1,
    opacity: 0.42,
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

export function createMotionProfile(random: () => number = Math.random): MotionProfile {
  const angularVelocity = (min: number, max: number) => {
    const direction = random() < 0.5 ? -1 : 1;
    return (direction * MathUtils.degToRad(randomInRange(random, min, max))) / 1000;
  };

  return {
    spinXRadiansPerMs: angularVelocity(7, 9),
    spinYRadiansPerMs: angularVelocity(10, 13),
    spinZRadiansPerMs: angularVelocity(4, 6),
  };
}

export function calculateContinuousPose(elapsedMs: number, profile: MotionProfile): ContinuousPose {
  const elapsed = Math.max(0, elapsedMs);
  const orbitAngle = (elapsed / ORBIT_DURATION_MS) * Math.PI * 2;
  const sinOrbit = Math.sin(orbitAngle);
  const cosOrbit = Math.cos(orbitAngle);

  return {
    position: {
      x: ORBIT_CENTER.x + ORBIT_OFFSET.x * cosOrbit + ORBIT_OFFSET.y * sinOrbit,
      y: ORBIT_CENTER.y - ORBIT_OFFSET.x * sinOrbit + ORBIT_OFFSET.y * cosOrbit,
      z: TRIANGLE_WORLD_POSITION.z,
    },
    rotation: {
      x: STATIC_ROTATION.x + profile.spinXRadiansPerMs * elapsed,
      y: STATIC_ROTATION.y + profile.spinYRadiansPerMs * elapsed,
      z: STATIC_ROTATION.z + profile.spinZRadiansPerMs * elapsed,
    },
  };
}
