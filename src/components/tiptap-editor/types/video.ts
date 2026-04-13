export type EditorJsonNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: EditorJsonNode[];
};

export type VideoNodeAttrs = {
  src: string;
  videoId?: number | null;
  poster?: string | null;
  controls?: boolean;
  style?: string;
};

export type VideoRegistryEntry = {
  videoId: number;
  src: string;
  poster?: string | null;
  controls?: boolean;
  style?: string;
};
