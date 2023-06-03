// 该函数将v-html中的图片拿到存入imgPreview.imgs中供el-image使用
// 每张图片绑定点击事件,得到下标值在el-image中显示

const bindImagesLayer = (htmlContent, imgPreview) => {
  // node节点是类数组argument,将其转化为数组
  const imgs = Array.prototype.slice.call(htmlContent?.querySelectorAll('img'));
  if (imgs?.length) {
    imgs.forEach((item: HTMLImageElement, index) => {
      item.setAttribute('loading', 'lazy'); //增加图片懒加载:延迟加载图像,直到它和视口接近到一个计算得到的距离(由浏览器定义).目的是在需要图像之前,避免加载图像所需要的网络和存储带宽。这通常会提高大多数典型用场景中内容的性能。
      item.classList.add('medium-zoom-image'); //为图片添加样式
      const src = item.getAttribute('src');
      if (!imgPreview.imgs.includes(src)) {
        imgPreview.imgs?.push(src);
      }
      item.addEventListener('click', () => {
        imgPreview.show = !imgPreview.show;
        // imgPreview.img = src!;
        imgPreview.index = index;
        document.querySelector('.img-preview')?.querySelector('img')?.click(); //手动控制el-image图片的点击
      });
    });
  }
  console.log('文章图片---------------------------', imgPreview.imgs);
};

export default bindImagesLayer;
