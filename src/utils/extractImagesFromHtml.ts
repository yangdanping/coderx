/**
 * 从HTML内容中提取所有图片的URL
 * @param html HTML内容字符串
 * @returns 图片URL数组
 */
export default function extractImagesFromHtml(html: string): string[] {
  if (!html) return [];

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const urls: string[] = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    // 过滤掉base64图片
    if (url && !url.startsWith('data:')) {
      urls.push(url);
    }
  }

  return urls;
}
