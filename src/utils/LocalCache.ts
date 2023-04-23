class LocalCache {
  /**
   * 进行本地数据缓存
   * @param key 设置键
   * @param value 设置值
   */
  static setCache(key: string, value: any) {
    // 传过来有可能是对象/数组...,所以用JSON.stringify统一转成字符串类型(序列化 obj --> string)在进行缓存
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * 获取本地缓存数据
   * @param key 要获取值对应的键
   */
  static getCache(key: string) {
    // 由于上面stringify了,所有这里拿到的一切value都是string类型的,这里用JSON.parse由JSON字符串转换为JSON对象(反序列化 string --> obj,因为已经stringify所以不怕转字符串报错)
    const value = window.localStorage.getItem(key);
    if (value) return JSON.parse(value);
  }

  /**
   * 删除本地缓存数据
   * @param key 要删除的值
   */
  static removeCache(key: string) {
    window.localStorage.removeItem(key);
  }

  /**
   * 清除所有本地数据缓存
   */
  static clearCache() {
    window.sessionStorage.clear();
    window.localStorage.clear();
  }
}

export default LocalCache; //new出来对象并导出去,这样外面就可以拿到对象去使用我们这里的属性/方法
