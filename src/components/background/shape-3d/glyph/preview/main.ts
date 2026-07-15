import { AmbientLight, DirectionalLight, OrthographicCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';
import { GLYPH_3D_CONFIG, type GlyphOutlineStyle } from '../../config';
import { createGlyphObject } from '../glyph3d';

const styles = ['rounded', 'display', 'serif'] as const satisfies readonly GlyphOutlineStyle[];
const desktopSpacing = 165;
const desktopMinHalfWidth = desktopSpacing + GLYPH_3D_CONFIG.targetHeight;
const stage = document.querySelector<HTMLElement>('[data-stage]');
const currentStyle = document.querySelector<HTMLElement>('[data-current-style]');
if (!stage || !currentStyle) throw new Error('glyph preview DOM is incomplete');

currentStyle.textContent = GLYPH_3D_CONFIG.outlineStyle;
document.querySelector(`[data-style="${GLYPH_3D_CONFIG.outlineStyle}"]`)?.setAttribute('data-current', 'true');

const renderer = new WebGLRenderer({ alpha: true, antialias: true });
renderer.outputColorSpace = SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.domElement.setAttribute('aria-hidden', 'true');
stage.prepend(renderer.domElement);

const scene = new Scene();
scene.add(new AmbientLight(0xffffff, 1.8));

const keyLight = new DirectionalLight(0xffffff, 3.2);
keyLight.position.set(-180, 220, 260);
scene.add(keyLight);

const fillLight = new DirectionalLight(0xf7aaa3, 1.1);
fillLight.position.set(220, -80, 120);
scene.add(fillLight);

const camera = new OrthographicCamera(-240, 240, 150, -150, 1, 1_200);
camera.position.set(0, 0, 440);
camera.lookAt(0, 0, 0);

const objects = styles.map((outlineStyle, index) => {
  const object = createGlyphObject({ ...GLYPH_3D_CONFIG, outlineStyle });
  scene.add(object.group);
  return { index, object };
});

function resize() {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  const stacked = window.matchMedia('(max-width: 720px)').matches;
  const aspect = width / height;
  const halfHeight = stacked ? 230 : Math.max(155, desktopMinHalfWidth / aspect);
  const halfWidth = halfHeight * aspect;

  objects.forEach(({ index, object }) => {
    object.group.position.set(stacked ? -42 : (index - 1) * desktopSpacing, stacked ? (1 - index) * 150 : 0, 0);
  });

  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  objects.forEach(({ object }) => object.outlineMaterial.resolution.set(width, height));
  renderer.render(scene, camera);
}

function renderStablePose() {
  objects.forEach(({ object }) => object.group.rotation.set(0.22, -0.28, 0.08));
  renderer.render(scene, camera);
}

let startedAt = performance.now();
function renderRotatingPose(time: number) {
  const elapsed = Math.max(0, time - startedAt) / 1_000;
  objects.forEach(({ object }) => {
    object.group.rotation.set(0.22 + elapsed * 0.16, -0.28 + elapsed * 0.24, elapsed * 0.09);
  });
  renderer.render(scene, camera);
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function configureMotion() {
  renderer.setAnimationLoop(null);
  if (reduceMotion.matches) {
    renderStablePose();
  } else {
    startedAt = performance.now();
    renderer.setAnimationLoop(renderRotatingPose);
  }
}

resize();
configureMotion();
window.addEventListener('resize', resize);
reduceMotion.addEventListener('change', configureMotion);
window.addEventListener(
  'beforeunload',
  () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    reduceMotion.removeEventListener('change', configureMotion);
    objects.forEach(({ object }) => object.dispose());
    renderer.dispose();
  },
  { once: true },
);
