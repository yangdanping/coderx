/**
 * ProseMirror EditorView 子集，用于 `selectVideoNodeOnMouseDown` 的最小类型约束。
 * 避免对完整 `@tiptap/core` EditorView 形成硬依赖。
 */
export interface VideoSelectionView {
  posAtDOM: (node: globalThis.Node, offset: number, bias?: number) => number;
  state: {
    doc: {
      resolve: (position: number) => {
        nodeAfter?: {
          type?: {
            spec?: {
              selectable?: boolean;
            };
          };
        } | null;
      };
    };
    tr: {
      setSelection: (selection: unknown) => unknown;
    };
  };
  dispatch: (transaction: unknown) => void;
  focus?: () => void;
}
