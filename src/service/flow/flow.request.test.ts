import { describe, expect, it } from 'vitest';

import { getFlowFeed, getFlowItemById } from './flow.request';

describe('flow mock data', () => {
  it('returns local Chinese posts with stable pagination', async () => {
    const firstPage = await getFlowFeed(1, 4);
    const secondPage = await getFlowFeed(2, 4);

    expect(firstPage.items).toHaveLength(4);
    expect(secondPage.items).toHaveLength(4);
    expect(firstPage.total).toBeGreaterThanOrEqual(12);
    expect(firstPage.items[0]?.body).toMatch(/[\u4e00-\u9fa5]/);
    expect(firstPage.items[0]?.author.name).toMatch(/[\u4e00-\u9fa5]/);
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id);
  });

  it('returns the same item for the detail view', async () => {
    const page = await getFlowFeed(1, 3);
    const item = page.items[1];

    expect(item).toBeDefined();
    await expect(getFlowItemById(item!.id)).resolves.toEqual(item);
    await expect(getFlowItemById(999999)).resolves.toBeNull();
  });
});
