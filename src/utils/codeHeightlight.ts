import Prismjs from 'prismjs'; //引入插件

const codeHeightlight = (htmlContent: any) => {
  console.log('codeHeightlight htmlContent', htmlContent);
  const codes = Array.of(...(htmlContent?.querySelectorAll('code') as any)).filter((block: any) => block.innerText.length > 30);
  console.log('codeHeightlight codes', codes);
  codes.forEach((code: any) => {
    code.classList.add('language-javascript'); //为图片添加样式
    code.classList.add('language-java'); //为图片添加样式
    Prismjs.highlightElement(code);
    // console.log('codeHeightlight code', code);
  });
};

export default codeHeightlight;
