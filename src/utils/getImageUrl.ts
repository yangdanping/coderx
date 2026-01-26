/**
 * 获取图片静态资源
 * @param docName assets/img下图片文件夹名
 * @param name 图片名称
 * @param type 图片类型(默认为png)
 * @returns 图片静态资源url
 */
export default function getImageUrl(docName: string, name: string, type: 'png' | 'svg' = 'png') {
  return new URL(`../assets/img/${docName}/${name}.${type}`, import.meta.url).href;
}
