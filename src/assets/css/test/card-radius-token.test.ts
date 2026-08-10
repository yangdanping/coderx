import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (filePath: string) => fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');

describe('global card radius token', () => {
  it('uses the collection-card radius as the shared default for home cards', () => {
    expect(readSource('src/assets/css/common.scss')).toContain('--card-border-radius: 6px');
    expect(readSource('src/views/user/cpns/UserCollect.vue')).toMatch(/\.item\.card-style[\s\S]*?border-radius:\s*var\(--card-border-radius\)/);
    expect(readSource('src/views/home/cpns/HomeHotUserCard.vue')).toContain('border-radius: var(--card-border-radius)');
    expect(readSource('src/views/home/cpns/features/FeatureDemoStage.vue')).toContain('border-radius: var(--card-border-radius)');
  });
});
