export type EditorJsonNode = {
  type?: string;
  content?: EditorJsonNode[];
};

export type VideoNodeAttrs = {
  src: string;
  poster?: string | null;
  controls?: boolean;
  style?: string;
};
