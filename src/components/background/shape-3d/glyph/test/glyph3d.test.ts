import { Box3, Color, ExtrudeGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { describe, expect, it, vi } from 'vitest';
import { GLYPH_3D_CONFIG, type GlyphOutlineStyle } from '../../config';
import { createGlyphObject } from '../glyph3d';

const styles = ['rounded', 'display', 'serif'] as const satisfies readonly GlyphOutlineStyle[];

function getParts(style: GlyphOutlineStyle = GLYPH_3D_CONFIG.outlineStyle) {
  const object = createGlyphObject({ ...GLYPH_3D_CONFIG, outlineStyle: style });
  const mesh = object.group.children.find((child) => child instanceof Mesh);
  const outline = object.group.children.find((child) => child instanceof LineSegments2);
  if (!mesh || !outline) throw new Error('glyph object is missing render parts');
  return { mesh, object, outline };
}

describe('glyph 3d object', () => {
  it.each(styles)('normalizes %s to one target height without scaling depth', (style) => {
    const { object } = getParts(style);
    const bounds = new Box3().setFromObject(object.group);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());

    expect(size.y).toBeCloseTo(GLYPH_3D_CONFIG.targetHeight, 4);
    expect(size.z).toBeCloseTo(GLYPH_3D_CONFIG.depth, 4);
    expect(center.x).toBeCloseTo(0, 5);
    expect(center.y).toBeCloseTo(0, 5);
    expect(center.z).toBeCloseTo(0, 5);
    expect(object.group.position.toArray()).toEqual([0, 0, 0]);
    expect(object.group.scale.y).toBe(-1);

    object.dispose();
  });

  it('uses glyph-owned visual values rather than importing arrow constants', () => {
    const { mesh, object } = getParts();
    const materials = Array.isArray(mesh.material) ? mesh.material : [];

    expect(materials).toHaveLength(2);
    expect(materials.every((material) => material instanceof MeshStandardMaterial)).toBe(true);
    expect(materials[0]?.color.getHexString()).toBe(new Color(GLYPH_3D_CONFIG.bodyColor).getHexString());
    expect(materials[1]?.color.getHexString()).toBe(new Color(GLYPH_3D_CONFIG.bodyColor).getHexString());
    expect(materials[0]?.opacity).toBe(GLYPH_3D_CONFIG.capOpacity);
    expect(materials[1]?.opacity).toBe(GLYPH_3D_CONFIG.sideOpacity);
    expect(materials[0]?.roughness).toBe(GLYPH_3D_CONFIG.roughness);
    expect(materials[1]?.metalness).toBe(GLYPH_3D_CONFIG.metalness);
    expect(object.outlineMaterial.color.getHexString()).toBe(new Color(GLYPH_3D_CONFIG.outlineColor).getHexString());
    expect(object.outlineMaterial.opacity).toBe(GLYPH_3D_CONFIG.outlineOpacity);
    expect(object.outlineMaterial.linewidth).toBe(GLYPH_3D_CONFIG.outlineWidth);

    object.dispose();
  });

  it('produces distinct finite geometry for all three outline selections', () => {
    const signatures = styles.map((style) => {
      const { mesh, object } = getParts(style);
      const position = mesh.geometry.getAttribute('position');
      const signature = `${position.count}:${Array.from(position.array)
        .slice(0, 24)
        .map((value) => Number(value).toFixed(3))
        .join(',')}`;
      expect(Array.from(position.array).every((value) => Number.isFinite(Number(value)))).toBe(true);
      object.dispose();
      return signature;
    });

    expect(new Set(signatures).size).toBe(3);
  });

  it('draws only front and back cap boundaries, never depth connectors', () => {
    const { object, outline } = getParts();
    const starts = outline.geometry.getAttribute('instanceStart');
    const ends = outline.geometry.getAttribute('instanceEnd');
    outline.geometry.computeBoundingBox();
    const size = outline.geometry.boundingBox?.getSize(new Vector3());

    expect(starts?.count).toBeGreaterThan(20);
    expect(size?.z).toBeCloseTo(GLYPH_3D_CONFIG.depth, 4);
    for (let index = 0; index < (starts?.count ?? 0); index += 1) {
      expect(starts?.getZ(index)).toBeCloseTo(ends?.getZ(index) ?? Number.NaN, 4);
    }

    object.dispose();
  });

  it('preserves cap-only outlines at shallow positive depths', () => {
    const object = createGlyphObject({ ...GLYPH_3D_CONFIG, depth: 0.0001 });
    const outline = object.group.children.find((child) => child instanceof LineSegments2);
    if (!outline) throw new Error('glyph object is missing its outline');
    const starts = outline.geometry.getAttribute('instanceStart');
    const ends = outline.geometry.getAttribute('instanceEnd');

    expect(starts?.count).toBeGreaterThan(0);
    for (let index = 0; index < (starts?.count ?? 0); index += 1) {
      expect(starts?.getZ(index)).toBe(ends?.getZ(index));
    }

    object.dispose();
  });

  it('owns every GPU resource and makes dispose idempotent', () => {
    const { mesh, object, outline } = getParts();
    const resources = [
      mesh.geometry,
      ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]),
      outline.geometry,
      outline.material,
    ];
    const disposeSpies = resources.map((resource) => vi.spyOn(resource, 'dispose'));

    object.dispose();
    object.dispose();

    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });

  it('releases resources created before a later construction failure', () => {
    const geometryDispose = vi.spyOn(ExtrudeGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(MeshStandardMaterial.prototype, 'dispose');
    const lineGeometryDispose = vi.spyOn(LineSegmentsGeometry.prototype, 'dispose');
    const setPositions = vi.spyOn(LineSegmentsGeometry.prototype, 'setPositions').mockImplementationOnce(() => {
      throw new Error('synthetic line failure');
    });

    try {
      expect(() => createGlyphObject()).toThrow('synthetic line failure');
      expect(geometryDispose).toHaveBeenCalledOnce();
      expect(materialDispose).toHaveBeenCalledTimes(2);
      expect(lineGeometryDispose).toHaveBeenCalledOnce();
    } finally {
      setPositions.mockRestore();
      lineGeometryDispose.mockRestore();
      materialDispose.mockRestore();
      geometryDispose.mockRestore();
    }
  });

  it('rejects invalid runtime dimensions before allocating render resources', () => {
    expect(() => createGlyphObject({ ...GLYPH_3D_CONFIG, targetHeight: 0 })).toThrow(/targetHeight must be finite and greater than zero/);
    expect(() => createGlyphObject({ ...GLYPH_3D_CONFIG, depth: Number.NaN })).toThrow(/depth must be finite and greater than zero/);
  });

  it('uses the expected Three.js line material implementation', () => {
    const { object } = getParts();
    expect(object.outlineMaterial).toBeInstanceOf(LineMaterial);
    object.dispose();
  });
});
