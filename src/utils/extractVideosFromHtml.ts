/**
 * 从HTML内容中提取所有视频的URL
 * @param html HTML内容字符串
 * @returns 视频URL数组
 */
export default function extractVideosFromHtml(html: string): string[] {
  if (!html) return [];

  const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const urls: string[] = [];
  let match;

  while ((match = videoRegex.exec(html)) !== null) {
    const url = match[1];
    // 过滤掉blob和data URL
    if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
      urls.push(url);
    }
  }

  return urls;
}
