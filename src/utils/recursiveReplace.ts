/**
 * 递归替换数据中的指定字符串
 * 主要用于解决后端返回绝对路径(如 localhost)在不同环境(局域网/线上)下访问失效的问题
 *
 * @param data 需要处理的数据 (string | array | object)
 * @param targetUrl 替换后的目标字符串 (通常是当前的 BASE_URL)
 * @param sourceStr 被替换的源字符串 (默认为 'http://localhost:8000')
 * @returns 处理后的数据
 */
export default function recursiveReplace(data: any, targetUrl: string, sourceStr: string = 'http://localhost:8000'): any {
  // 1. 字符串类型：直接检查并替换
  if (typeof data === 'string') {
    // 性能优化：简单判断包含关系，避免无意义的正则/replaceAll开销
    if (data.includes(sourceStr)) {
      return data.replaceAll(sourceStr, targetUrl);
    }
    return data;
  }

  // 2. 数组类型：递归映射每个元素
  if (Array.isArray(data)) {
    return data.map((item) => recursiveReplace(item, targetUrl, sourceStr));
  }

  // 3. 对象类型：递归遍历属性值
  if (data !== null && typeof data === 'object') {
    // 浅拷贝一层，避免直接修改原引用可能带来的副作用
    // 注意：对于深层嵌套对象，这里只拷贝了当前层，子层会在递归中被处理
    const newData = { ...data };
    for (const key in newData) {
      if (Object.prototype.hasOwnProperty.call(newData, key)) {
        newData[key] = recursiveReplace(newData[key], targetUrl, sourceStr);
      }
    }
    return newData;
  }

  // 4. 其他类型(number, boolean, null, undefined)：原样返回
  return data;
}
