/**
 * 判断是否为空对象,若不是空对象则返回true
 * @param obj 对象
 * @returns
 */
export default function isEmptyObj(obj = {}) {
  return !!Object.keys(obj).length;
}
