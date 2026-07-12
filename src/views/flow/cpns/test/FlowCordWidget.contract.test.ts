import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/views/flow/cpns/FlowCordWidget.vue'), 'utf8');

describe('FlowCordWidget layout contract', () => {
  it('anchors the outside cord layer to the viewport top', () => {
    const outsideBlock = source.match(/\.flow-cord-outside\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(outsideBlock).toContain('position: fixed;');
    expect(outsideBlock).toContain('top: 0;');
    expect(outsideBlock).toContain('z-index: var(--z-sticky);');
    expect(outsideBlock).not.toContain('navbarHeight');
  });
});
