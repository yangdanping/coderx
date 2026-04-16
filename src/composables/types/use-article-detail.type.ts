import type { ComputedRef, Ref } from 'vue';

export type ArticleIdSource = Ref<string | undefined> | ComputedRef<string | undefined>;
