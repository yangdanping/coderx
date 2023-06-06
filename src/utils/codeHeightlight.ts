import Prism from 'prismjs'; //引入插件

type CodeType = 'javascript' | 'typescript' | 'java';

const codeHeightlight = (htmlContent: any, type: CodeType = 'javascript') => {
  console.log('codeHeightlight htmlContent', htmlContent);
  const codes = Array.from(htmlContent?.querySelectorAll('code')).filter((block: any) => block.innerText.length > 30);
  console.log('codeHeightlight codes', codes);
  codes.forEach((code: any) => {
    code.classList.add(`language-${type}`);
    // code.classList.add('language-java');
    Prism.highlightElement(code);
    // console.log('codeHeightlight code', code);
  });
};

export default codeHeightlight;
