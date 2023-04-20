/**
 * 通过映射实现点击记住菜单选项
 * @param userMenus 用户菜单
 * @param currentPath 当前路由
 * @returns 当前路由对应的菜单对象
 */
// 原来的思路 --> 点击菜单调用事件来获取id,但如何保存是个问题,所以想到获取当前路由与userMenus匹配的方法
export function pathMapToMenu(routes: any[], currentPath: string): any {
  // return breadcrumbs; //在传入第三个参数时,说明要得到面包屑
}
