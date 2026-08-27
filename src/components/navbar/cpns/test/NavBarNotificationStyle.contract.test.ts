import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/components/navbar/cpns/NavBarNotification.vue'), 'utf8');

describe('NavBarNotification badge style contract', () => {
  it('uses a soft outlined badge palette with an explicit dark-mode override', () => {
    expect(source).toContain('--notification-badge-surface: #fff4f5;');
    expect(source).toContain('--notification-badge-text: #bd4654;');
    expect(source).toContain('box-sizing: border-box;');
    expect(source).toContain('padding: 0 4px;');
    expect(source).toContain('border: 1px solid var(--notification-badge-border);');
    expect(source).toContain('box-shadow: var(--notification-badge-shadow);');
    expect(source).toMatch(/:global\(html\.dark\) \.notification-badge[\s\S]*--notification-badge-surface: rgba\(145, 40, 51, 0\.22\);/);
    expect(source).toContain('--notification-badge-text: #ff9ca5;');
  });
});
