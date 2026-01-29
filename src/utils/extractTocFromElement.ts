export interface ITocTitle {
  id: string;
  title: string;
  level: number;
}

/**
 * 从 HTML 元素中提取标题并生成目录数据，同时为标题元素设置 id
 * @param el 包含标题的容器元素
 * @param selector 标题选择器，默认为 'h1, h2'
 * @returns 目录标题列表
 */
export const extractTocFromElement = (el: HTMLElement, selector: string = 'h1, h2'): ITocTitle[] => {
  const headers = el.querySelectorAll(selector);
  return Array.from(headers).map((header, index) => {
    const id = `article-header-${index}`;
    header.setAttribute('id', id);
    return {
      id,
      title: (header as HTMLElement).innerText,
      level: Number(header.tagName.substring(1)),
    };
  });
};
