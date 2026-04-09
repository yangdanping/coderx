/**
 * 顶栏「Flow」路径：与 `.env` 中 `VITE_IS_DEV_MODE` 一致。
 * - `'true'` → `/flow`（正式 Feed）
 * - 否则 → `/dev`（占位页）
 */
export function flowNavPath(): '/flow' | '/dev' {
  return import.meta.env.VITE_IS_DEV_MODE === 'true' ? '/flow' : '/dev';
}
