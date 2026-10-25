# 首页 Features 示例数据说明

核对日期：2026-10-25。这些 JSON 文件用于首页 Features 展示区的本地演示，演示对话不调用真实 AI；点击“Go check / Go chat”会通过后端选择真实文章，“Go edit”跳转编辑页。

## 文件说明

- `features.json`
  - 控制 4 个展示步骤的标题、描述和 action 按钮；ID 必须匹配 `FeatureSection.vue` 的组件映射。
- `article-toc-demo.json`
  - 控制“浏览文章自动目录划分”示例。
  - `sections` 里的每一项都会渲染成一个章节，并自动生成右侧目录。
- `ai-chat-demo.json`
  - 控制“AI 助手：文章总结”示例的对话脚本、打字速度和思考时长。
- `ai-completion-demo.json`
  - 控制“AI 助手：辅助编写提示”示例的编辑器初始文本、补全文案与选中项。
- `markdown-demo.json`
  - 控制“Markdown 实时渲染”示例里左侧逐步输入的 Markdown 内容。

## 如何自定义文章示例

`article-toc-demo.json` 的章节结构如下：

```json
{
  "title": "文章标题",
  "intro": "开头说明",
  "sections": [
    {
      "id": "section-id",
      "heading": "一、章节标题",
      "level": 1,
      "paragraphs": ["第一段", "第二段"],
      "image": {
        "src": "/feature-demo/article-cover.png",
        "alt": "图片说明"
      },
      "code": "const demo = true;"
    }
  ]
}
```

### 图片怎么放

推荐两种方式：

1. 放到前端项目的 `public/` 目录下。
2. 在 JSON 里使用以 `/` 开头的地址。

例如：

```json
{
  "src": "/feature-demo/article-cover.png",
  "alt": "文章配图"
}
```

这样浏览器会从 `public/feature-demo/article-cover.png` 读取图片。

你也可以直接填远程图片 URL。

## 文案与节奏怎么改

- 打字速度：`typingSpeed`
- AI 流式输出速度：`streamSpeed`
- 思考加载时长：`thinkingDelay` / `loadingDelay`
- 循环重播间隔：`loopDelay`

单位都是毫秒。

## 小提示

- `id` 尽量保持唯一，避免目录跳转混乱。
- 如果你把段落写得更长，文章目录示例的滚动空间会更明显。
- Markdown 示例支持标题、列表、引用、代码块等常见语法，建议保留至少一种代码块，这样右侧预览更有辨识度。

## 当前展示与动画入口

旧的 `FeatureCard.vue` 和 `emit('activate')` 链路已移除。当前由以下文件组织：

| 文件                                                                              | 职责                                                                                                   |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [FeatureSection.vue](../cpns/features/FeatureSection.vue)                         | 将 JSON ID 映射到演示组件，处理真实文章/编辑页跳转                                                     |
| [useFeatureStoryMotion.ts](../cpns/features/composables/useFeatureStoryMotion.ts) | 通过滚动位置和 requestAnimationFrame 计算目标步骤与展示步骤，管理离场/入场阶段；减少动态效果时直接切换 |
| [FeatureDemoStage.vue](../cpns/features/FeatureDemoStage.vue)                     | 桌面固定展示区，按当前 feature ID 切换 demo，并传递 active 状态                                        |
| [FeatureNarrativeStep.vue](../cpns/features/FeatureNarrativeStep.vue)             | 展示文字与按钮，移动布局中直接嵌入对应 demo                                                            |

修改演示数据通常只需调整本目录 JSON。修改滚动切换逻辑时查看 `useFeatureStoryMotion`；通用 [useFadeIn](../../../composables/useFadeIn.ts) 仍供其他调用者使用，不是当前 Features 的切换入口。
