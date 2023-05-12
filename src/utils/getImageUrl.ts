/**
 * 获取图片静态资源
 * @param docName assets/img下图片文件夹名
 * @param name 图片名称
 * @param type 图片类型(默认为png)
 * @returns 图片静态资源url
 */
export default function getImageUrl(docName: string, name: string, type: 'png' | 'svg' = 'png') {
  const imgAssets = new URL('@/assets/img', import.meta.url).href;
  return new URL(`${imgAssets}/${docName}/${name}.${type}`, import.meta.url).href;
}
