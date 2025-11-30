// 该函数将v-html中的图片拿到存入imgPreview.imgs中供el-image-viewer使用
// 每张图片绑定点击事件,得到下标值打开预览

const bindImagesLayer = (htmlContent: HTMLElement, imgPreview: any) => {
  const imgs = Array.from(htmlContent.querySelectorAll('img'));
  imgPreview.imgs = []; // 重置图片列表

  if (imgs.length) {
    imgs.forEach((item: HTMLImageElement, index: number) => {
      item.setAttribute('loading', 'lazy'); // 图片懒加载
      item.classList.add('medium-zoom-image'); // 添加样式

      const src = item.getAttribute('src');
      if (src) {
        imgPreview.imgs.push(src);

        item.addEventListener('click', (e) => {
          e.stopPropagation(); // 阻止冒泡
          imgPreview.index = index;
          imgPreview.show = true;
        });
      }
    });
  }
};

export default bindImagesLayer;
