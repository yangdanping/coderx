export const STACK_LAYOUT_BREAKPOINT = 1040;
export const MOBILE_SCENE_OFFSET_X = 0.06;

export function resolveResponsiveSceneOffsetX(viewportWidth: number) {
  return viewportWidth <= STACK_LAYOUT_BREAKPOINT ? MOBILE_SCENE_OFFSET_X : 0;
}
