import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLOBAL_BACKGROUND_CONFIG, GLOBAL_SHAPE_DESCRIPTORS } from '../../config';

const triangleHashes = {
  'BackgroundTriangle3D.vue': '72e4647fcca3d93d27d7838c38e7fa30fa52d49e0665790b7a9da14e61c5c235',
  'triangle3d.ts': '385c0e197b08d02b583fca6604a98d6d725649fa159783d4933fc7235510d7cc',
  'triangle3d-runtime.ts': '12603ef8476034ded25791758db97ba307964cacfc645f78c60f82ce7d319841',
  'test/BackgroundTriangle3D.test.ts': 'ac659729a76bc9fa255f5b491b096673cea6b7b2295267585c8d0ae4f989c7de',
  'test/triangle3d.test.ts': '8232db2e23fc029d1d2dc869b35c8922936cbd6ec33ba3052d75eeaf4ba8ed9c',
  'test/triangle3d-runtime.test.ts': '21c891ba2d3466c8589c3c8f7f47005a9273d42cc1d06db014b30b9de9665c7b',
} as const;

const bgSvgHash = 'a7150f1cdf25d4dd59a6b029e50d3b799bd42e12427952944b348caf80402ad8';

describe('global 3d background configuration', () => {
  it('defines the six SVG-derived roles in stable order', () => {
    expect(GLOBAL_SHAPE_DESCRIPTORS.map(({ id, color, motion }) => ({ id, color, tier: motion.tier }))).toEqual([
      { id: 'blue-puck', color: '#1a73e8', tier: 'pace' },
      { id: 'neutral-puck', color: '#f1f3f4', tier: 'pace' },
      { id: 'green-slab', color: '#bee0c6', tier: 'spin' },
      { id: 'yellow-arch', color: '#fdd663', tier: 'spin' },
      { id: 'neutral-pill', color: '#f1f3f4', tier: 'pace' },
      { id: 'green-cube', color: '#bee0c6', tier: 'pace' },
    ]);
  });

  it('owns the approved material and rendering limits', () => {
    expect(GLOBAL_BACKGROUND_CONFIG.material).toEqual({
      capOpacity: 0.28,
      sideOpacity: 0.26,
      outlineOpacity: 0.42,
      outlineWidth: 1,
      roughness: 0.95,
      metalness: 0,
    });
    expect(GLOBAL_BACKGROUND_CONFIG.desktop).toEqual({ dprCap: 1.5, fps: 30, motionScale: 1, tiltScale: 1 });
    expect(GLOBAL_BACKGROUND_CONFIG.narrow).toEqual({ dprCap: 1.25, fps: 24, motionScale: 0.6, tiltScale: 0.75 });
    expect(GLOBAL_BACKGROUND_CONFIG.narrowMaxWidth).toBe(767);
  });

  it.each(Object.entries(triangleHashes))('keeps triangle file %s byte-for-byte unchanged', (relativePath, expected) => {
    const bytes = readFileSync(join(process.cwd(), 'src/components/background/shape-3d/triangle', relativePath));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(expected);
  });

  it('keeps the SVG fallback byte-for-byte unchanged', () => {
    const bytes = readFileSync(join(process.cwd(), 'src/assets/img/bg.svg'));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(bgSvgHash);
  });
});
