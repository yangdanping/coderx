export type GlobalShapeId = 'blue-puck' | 'neutral-puck' | 'green-slab' | 'yellow-arch' | 'neutral-pill' | 'green-cube';

export type GlobalGeometryConfig =
  | { kind: 'circle'; diameter: number }
  | { kind: 'rounded-rect'; width: number; height: number; radius: number }
  | { kind: 'arch'; width: number; arcHeight: number; baseHeight: number; baseRadius: number };

export type GlobalMotionConfig =
  | { tier: 'spin'; durationMs: number; turns: readonly [number, number, number] }
  | {
      tier: 'pace';
      durationMs: number;
      phase: number;
      travel: readonly [number, number];
      tiltDegrees: readonly [number, number, number];
    };

export interface GlobalShapeDescriptor {
  id: GlobalShapeId;
  color: string;
  depth: number;
  geometry: GlobalGeometryConfig;
  position: readonly [number, number, number];
  rotationDegrees: readonly [number, number, number];
  opacity: number;
  motion: GlobalMotionConfig;
}

export interface GlobalRenderingProfile {
  dprCap: number;
  fps: number;
  motionScale: number;
  tiltScale: number;
}

export const GLOBAL_BACKGROUND_CONFIG = {
  viewBox: { width: 1400, height: 800 },
  narrowMaxWidth: 767,
  material: {
    capOpacity: 0.28,
    sideOpacity: 0.26,
    outlineOpacity: 0.42,
    outlineWidth: 1,
    roughness: 0.95,
    metalness: 0,
  },
  desktop: { dprCap: 1.5, fps: 30, motionScale: 1, tiltScale: 1 },
  narrow: { dprCap: 1.25, fps: 24, motionScale: 0.6, tiltScale: 0.75 },
} as const satisfies {
  viewBox: { width: number; height: number };
  narrowMaxWidth: number;
  material: {
    capOpacity: number;
    sideOpacity: number;
    outlineOpacity: number;
    outlineWidth: number;
    roughness: number;
    metalness: number;
  };
  desktop: GlobalRenderingProfile;
  narrow: GlobalRenderingProfile;
};

export const GLOBAL_SHAPE_DESCRIPTORS = [
  {
    id: 'blue-puck',
    color: '#1a73e8',
    depth: 14,
    geometry: { kind: 'circle', diameter: 60 },
    position: [-720, 310, 0],
    rotationDegrees: [5, -7, -2],
    opacity: 0.72,
    motion: { tier: 'pace', durationMs: 15_000, phase: 0, travel: [12, 6], tiltDegrees: [6, 6, 3] },
  },
  {
    id: 'neutral-puck',
    color: '#f1f3f4',
    depth: 12,
    geometry: { kind: 'circle', diameter: 60 },
    position: [500, -200, 0],
    rotationDegrees: [-4, 5, 1],
    opacity: 0.52,
    motion: { tier: 'pace', durationMs: 24_000, phase: Math.PI, travel: [10, 8], tiltDegrees: [5, 6, 2] },
  },
  {
    id: 'green-slab',
    color: '#bee0c6',
    depth: 32,
    geometry: { kind: 'rounded-rect', width: 300, height: 300, radius: 40 },
    position: [750, -150, 0],
    rotationDegrees: [16, -12, 3],
    opacity: 1,
    motion: { tier: 'spin', durationMs: 108_000, turns: [-1, -1, -1] },
  },
  {
    id: 'yellow-arch',
    color: '#fdd663',
    depth: 28,
    geometry: { kind: 'arch', width: 300, arcHeight: 150, baseHeight: 20, baseRadius: 20 },
    position: [350, 315, 0],
    rotationDegrees: [12, -16, -4],
    opacity: 1,
    motion: { tier: 'spin', durationMs: 92_000, turns: [1, 1, 1] },
  },
  {
    id: 'neutral-pill',
    color: '#f1f3f4',
    depth: 12,
    geometry: { kind: 'rounded-rect', width: 80, height: 160, radius: 40 },
    position: [-420, -380, 0],
    rotationDegrees: [4, -5, -2],
    opacity: 0.4,
    motion: { tier: 'pace', durationMs: 22_000, phase: Math.PI / 2, travel: [10, 8], tiltDegrees: [5, 6, 3] },
  },
  {
    id: 'green-cube',
    color: '#bee0c6',
    depth: 20,
    geometry: { kind: 'rounded-rect', width: 100, height: 100, radius: 40 },
    position: [-287, -313, 0],
    rotationDegrees: [-5, 5, -2],
    opacity: 0.68,
    motion: { tier: 'pace', durationMs: 19_000, phase: Math.PI * 1.5, travel: [10, 8], tiltDegrees: [6, 6, 2] },
  },
] as const satisfies readonly GlobalShapeDescriptor[];
