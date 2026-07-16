import { Box3, Color, ExtrudeGeometry, MathUtils, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { describe, expect, it, vi } from 'vitest';
import { GLOBAL_BACKGROUND_CONFIG, GLOBAL_SHAPE_DESCRIPTORS, type GlobalShapeDescriptor } from '../../config';
import { createGlobalBackgroundObject, createGlobalBackgroundObjects } from '../global-background3d';

function getParts(descriptor: GlobalShapeDescriptor) {
  const object = createGlobalBackgroundObject(descriptor);
  const mesh = object.group.children.find((child) => child instanceof Mesh);
  const outline = object.group.children.find((child) => child instanceof LineSegments2);
  if (!mesh || !outline) throw new Error(`${descriptor.id} is missing render parts`);
  return { mesh, object, outline };
}

describe('global background 3d objects', () => {
  it('creates all six finite, locally centered extrusions at their configured anchors', () => {
    for (const descriptor of GLOBAL_SHAPE_DESCRIPTORS) {
      const { mesh, object } = getParts(descriptor);
      const position = mesh.geometry.getAttribute('position');
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox;
      const size = bounds?.getSize(new Vector3());
      const center = bounds?.getCenter(new Vector3());

      expect(Array.from(position.array).every((value) => Number.isFinite(Number(value)))).toBe(true);
      expect(size?.x).toBeGreaterThan(0);
      expect(size?.y).toBeGreaterThan(0);
      expect(size?.z).toBeCloseTo(descriptor.depth, 5);
      expect(center?.toArray()).toEqual([0, 0, 0]);
      expect(object.group.position.toArray()).toEqual([...descriptor.position]);
      expect(object.group.rotation.x).toBeCloseTo(MathUtils.degToRad(descriptor.rotationDegrees[0]), 6);
      expect(object.group.rotation.y).toBeCloseTo(MathUtils.degToRad(descriptor.rotationDegrees[1]), 6);
      expect(object.group.rotation.z).toBeCloseTo(MathUtils.degToRad(descriptor.rotationDegrees[2]), 6);

      object.dispose();
    }
  });

  it('preserves the configured two-dimensional bounds for each geometry kind', () => {
    for (const descriptor of GLOBAL_SHAPE_DESCRIPTORS) {
      const { mesh, object } = getParts(descriptor);
      mesh.geometry.computeBoundingBox();
      const size = mesh.geometry.boundingBox?.getSize(new Vector3());

      if (descriptor.geometry.kind === 'circle') {
        expect(size?.x).toBeCloseTo(descriptor.geometry.diameter, 4);
        expect(size?.y).toBeCloseTo(descriptor.geometry.diameter, 4);
      } else if (descriptor.geometry.kind === 'rounded-rect') {
        expect(size?.x).toBeCloseTo(descriptor.geometry.width, 4);
        expect(size?.y).toBeCloseTo(descriptor.geometry.height, 4);
      } else {
        expect(size?.x).toBeCloseTo(descriptor.geometry.width, 4);
        expect(size?.y).toBeCloseTo(descriptor.geometry.arcHeight + descriptor.geometry.baseHeight, 4);
      }

      object.dispose();
    }
  });

  it('uses module-owned soft-plastic materials with object-level opacity', () => {
    for (const descriptor of GLOBAL_SHAPE_DESCRIPTORS) {
      const { mesh, object } = getParts(descriptor);
      const materials = Array.isArray(mesh.material) ? mesh.material : [];
      const expectedColor = new Color(descriptor.color).getHexString();

      expect(materials).toHaveLength(2);
      expect(materials.every((material) => material instanceof MeshStandardMaterial)).toBe(true);
      expect(materials[0]?.color.getHexString()).toBe(expectedColor);
      expect(materials[1]?.color.getHexString()).toBe(expectedColor);
      expect(materials[0]?.opacity).toBeCloseTo(GLOBAL_BACKGROUND_CONFIG.material.capOpacity * descriptor.opacity, 6);
      expect(materials[1]?.opacity).toBeCloseTo(GLOBAL_BACKGROUND_CONFIG.material.sideOpacity * descriptor.opacity, 6);
      expect(materials[0]?.roughness).toBe(GLOBAL_BACKGROUND_CONFIG.material.roughness);
      expect(materials[1]?.metalness).toBe(GLOBAL_BACKGROUND_CONFIG.material.metalness);
      expect(object.outlineMaterial).toBeInstanceOf(LineMaterial);
      expect(object.outlineMaterial.color.getHexString()).toBe(expectedColor);
      expect(object.outlineMaterial.opacity).toBeCloseTo(GLOBAL_BACKGROUND_CONFIG.material.outlineOpacity * descriptor.opacity, 6);
      expect(object.outlineMaterial.linewidth).toBe(GLOBAL_BACKGROUND_CONFIG.material.outlineWidth);

      object.dispose();
    }
  });

  it('draws front and back cap boundaries without depth connectors', () => {
    for (const descriptor of GLOBAL_SHAPE_DESCRIPTORS) {
      const { object, outline } = getParts(descriptor);
      const starts = outline.geometry.getAttribute('instanceStart');
      const ends = outline.geometry.getAttribute('instanceEnd');
      outline.geometry.computeBoundingBox();
      const size = outline.geometry.boundingBox?.getSize(new Vector3());

      expect(starts.count).toBeGreaterThan(0);
      expect(size?.z).toBeCloseTo(descriptor.depth, 5);
      for (let index = 0; index < starts.count; index += 1) {
        expect(starts.getZ(index)).toBeCloseTo(ends.getZ(index), 5);
      }

      object.dispose();
    }
  });

  it('creates one stable object for every descriptor', () => {
    const objects = createGlobalBackgroundObjects();

    expect(objects.map(({ id }) => id)).toEqual(GLOBAL_SHAPE_DESCRIPTORS.map(({ id }) => id));
    objects.forEach((object) => object.dispose());
  });

  it('owns every GPU resource and makes disposal idempotent', () => {
    const { mesh, object, outline } = getParts(GLOBAL_SHAPE_DESCRIPTORS[0]);
    const resources = [mesh.geometry, ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material]), outline.geometry, outline.material];
    const disposeSpies = resources.map((resource) => vi.spyOn(resource, 'dispose'));

    object.dispose();
    object.dispose();

    disposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledOnce());
  });

  it('releases allocated resources when construction fails later', () => {
    const geometryDispose = vi.spyOn(ExtrudeGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(MeshStandardMaterial.prototype, 'dispose');
    const lineGeometryDispose = vi.spyOn(LineSegmentsGeometry.prototype, 'dispose');
    const setPositions = vi.spyOn(LineSegmentsGeometry.prototype, 'setPositions').mockImplementationOnce(() => {
      throw new Error('synthetic outline failure');
    });

    try {
      expect(() => createGlobalBackgroundObject(GLOBAL_SHAPE_DESCRIPTORS[0])).toThrow('synthetic outline failure');
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

  it('rejects invalid runtime dimensions before creating render resources', () => {
    const descriptor = { ...GLOBAL_SHAPE_DESCRIPTORS[0], depth: 0 } as GlobalShapeDescriptor;
    expect(() => createGlobalBackgroundObject(descriptor)).toThrow(/depth must be finite and greater than zero/);
  });

  it('keeps world placement separate from local geometry bounds', () => {
    const descriptor = GLOBAL_SHAPE_DESCRIPTORS[2];
    const { mesh, object } = getParts(descriptor);
    const localBounds = new Box3().setFromObject(mesh);

    expect(localBounds.getCenter(new Vector3()).length()).toBeCloseTo(0, 5);
    expect(object.group.position.length()).toBeGreaterThan(0);
    object.dispose();
  });
});
