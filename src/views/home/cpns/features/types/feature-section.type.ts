export type FeatureAction =
  | {
      kind: 'random-toc';
      label: 'Go check';
    }
  | {
      kind: 'edit';
      label: 'Go edit';
    };

export interface FeatureMeta {
  id: string;
  title: string;
  description: string;
  action: FeatureAction;
}
