export default function isArrEqual(arr1: any[], arr2: any[]) {
  return arr1.length === arr2.length && arr1.every((ele) => arr2.includes(ele));
}
