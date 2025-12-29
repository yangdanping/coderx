/**
 * 递归替换数据中的指定字符串
 * 主要用于解决后端返回绝对路径(如 localhost)在不同环境(局域网/线上)下访问失效的问题
 *
 * @param data 需要处理的数据 (string | array | object)
 * @param targetUrl 替换后的目标字符串 (通常是当前的 BASE_URL)
 * @param sourceStr 被替换的源字符串，支持字符串或字符串数组
 * @returns 处理后的数据
 */
export default function recursiveReplace(data: any, targetUrl: string, sourceStr: string | string[] = 'http://localhost:8000'): any {
  // 1. 字符串类型：直接检查并替换
  if (typeof data === 'string') {
    // 支持多个源地址（数组）
    if (Array.isArray(sourceStr)) {
      let result = data;
      // 依次替换所有源地址（只遍历字符串一次，只在包含时才替换）
      for (const source of sourceStr) {
        if (result.includes(source)) {
          result = result.replaceAll(source, targetUrl);
        }
      }
      return result;
    }

    // 单个源地址（向后兼容）
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
