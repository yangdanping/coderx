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
export interface TriangleShapeConfig {
  sideLength: number;
  heightScale: number;
  tipSkew: number;
  notchDepth: number;
  cornerRadius: number;
}

export interface TrianglePoint {
  x: number;
  y: number;
}

export interface TriangleGuide {
  tip: TrianglePoint;
  bottomRight: TrianglePoint;
  notch: TrianglePoint;
  bottomLeft: TrianglePoint;
}

export const TRIANGLE_SHAPE_CONFIG = {
  sideLength: 112,
  heightScale: 1,
  tipSkew: 0,
  notchDepth: 22,
  cornerRadius: 10,
} as const satisfies TriangleShapeConfig;
export const STATIC_ROTATION = {
  x: MathUtils.degToRad(8),
  y: MathUtils.degToRad(-12),
  z: 0,
} as const;

const TRIANGLE_CENTER = { x: 217.5, y: 530 } as const;
const ARROW_DIRECTION_RADIANS = MathUtils.degToRad(58);
const ORBIT_CENTER = { x: -600, y: 20 } as const;
const ORBIT_OFFSET = {
  x: TRIANGLE_WORLD_POSITION.x - ORBIT_CENTER.x,
  y: TRIANGLE_WORLD_POSITION.y - ORBIT_CENTER.y,
} as const;
const BEVEL_SIZE = 0;
const CORE_DEPTH = TRIANGLE_TOTAL_DEPTH - BEVEL_SIZE * 2;

function rotateAndTranslate(point: TrianglePoint): TrianglePoint {
  const cos = Math.cos(ARROW_DIRECTION_RADIANS);
  const sin = Math.sin(ARROW_DIRECTION_RADIANS);
  return {
    x: TRIANGLE_CENTER.x + point.x * cos - point.y * sin,
    y: TRIANGLE_CENTER.y + point.x * sin + point.y * cos,
  };
}

export function calculateTriangleGuide(config: TriangleShapeConfig = TRIANGLE_SHAPE_CONFIG): TriangleGuide {
  const height = (config.sideLength * Math.sqrt(3) * config.heightScale) / 2;
  const tip = { x: config.tipSkew, y: (-2 * height) / 3 };
  const bottomRight = { x: config.sideLength / 2, y: height / 3 };
  const bottomLeft = { x: -config.sideLength / 2, y: height / 3 };
  const baseMidpoint = { x: 0, y: height / 3 };
  const towardTip = { x: tip.x - baseMidpoint.x, y: tip.y - baseMidpoint.y };
  const towardTipLength = Math.hypot(towardTip.x, towardTip.y) || 1;
  const notch = {
    x: baseMidpoint.x + (towardTip.x / towardTipLength) * config.notchDepth,
    y: baseMidpoint.y + (towardTip.y / towardTipLength) * config.notchDepth,
  };

  return {
    tip: rotateAndTranslate(tip),
    bottomRight: rotateAndTranslate(bottomRight),
    notch: rotateAndTranslate(notch),
    bottomLeft: rotateAndTranslate(bottomLeft),
  };
}

type TrianglePathCommand =
  | { type: 'M' | 'L'; point: TrianglePoint }
  | { type: 'Q'; control: TrianglePoint; point: TrianglePoint }
  | { type: 'Z' };

function distanceBetween(a: TrianglePoint, b: TrianglePoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function moveToward(from: TrianglePoint, to: TrianglePoint, distance: number): TrianglePoint {
  const length = distanceBetween(from, to) || 1;
  const ratio = distance / length;
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

function createRoundedPathCommands(config: TriangleShapeConfig): TrianglePathCommand[] {
  const guide = calculateTriangleGuide(config);
  const polygon = [guide.tip, guide.bottomRight, guide.notch, guide.bottomLeft];
  const corners = polygon.map((point, index) => {
    const previous = polygon[(index - 1 + polygon.length) % polygon.length]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const safeRadius = Math.min(
      Math.max(0, config.cornerRadius),
      distanceBetween(point, previous) * 0.4,
      distanceBetween(point, next) * 0.4,
    );

    return {
      control: point,
      entry: moveToward(point, previous, safeRadius),
      exit: moveToward(point, next, safeRadius),
    };
  });
  const firstCorner = corners[0]!;
  const commands: TrianglePathCommand[] = [{ type: 'M', point: firstCorner.entry }];

  corners.forEach((corner, index) => {
    if (index > 0) commands.push({ type: 'L', point: corner.entry });
    commands.push({ type: 'Q', control: corner.control, point: corner.exit });
  });
  commands.push({ type: 'L', point: firstCorner.entry }, { type: 'Z' });

  return commands;
}

const TRIANGLE_ARROW_PATH = createRoundedPathCommands(TRIANGLE_SHAPE_CONFIG);

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

function localPathPoint(point: TrianglePoint): [number, number] {
  return localPoint(point.x, point.y);
}

function formatCoordinate(value: number) {
  return Number(value.toFixed(4)).toString();
}

function pointText(point: TrianglePoint) {
  return `${formatCoordinate(point.x)} ${formatCoordinate(point.y)}`;
}

export const TRIANGLE_FALLBACK_PATH = TRIANGLE_ARROW_PATH.map((command) => {
  if (command.type === 'Z') return 'Z';
  if (command.type === 'Q') {
    return `Q ${pointText(command.control)} ${pointText(command.point)}`;
  }
  return `${command.type} ${pointText(command.point)}`;
}).join(' ');

export function createTriangleShape(config: TriangleShapeConfig = TRIANGLE_SHAPE_CONFIG) {
  const shape = new Shape();

  for (const command of createRoundedPathCommands(config)) {
    if (command.type === 'Z') {
      shape.closePath();
      continue;
    }

    const point = localPathPoint(command.point);
    if (command.type === 'M') shape.moveTo(...point);
    else if (command.type === 'L') shape.lineTo(...point);
    else shape.quadraticCurveTo(...localPathPoint(command.control), ...point);
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
