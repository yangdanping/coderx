import hljs from 'highlight.js/lib/core'
// 注册常用语言
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import java from 'highlight.js/lib/languages/java'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml' // 包含 HTML
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'

// 注册语言
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('java', java)
hljs.registerLanguage('python', python)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sql', sql)

/**
 * 对 HTML 容器内的代码块进行语法高亮
 * @param htmlContent HTML 容器元素
 */
const codeHeightlight = (htmlContent: HTMLElement | null) => {
  if (!htmlContent) return

  // 查找所有 pre > code 元素（代码块）
  const codeBlocks = htmlContent.querySelectorAll('pre code')

  codeBlocks.forEach((code) => {
    // 如果已经高亮过，跳过
    if (code.classList.contains('hljs')) return

    // 使用 highlight.js 自动检测语言并高亮
    hljs.highlightElement(code as HTMLElement)
  })
}

export default codeHeightlight
