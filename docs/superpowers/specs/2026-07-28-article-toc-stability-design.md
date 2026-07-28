# 文章目录 active 稳定性与可读性设计

## 背景与目标

本设计修正 `2026-07-26-notion-style-article-toc-design.md` 中“active 项通过字重与不同缩进强调”的约束。真实浏览器和用户提供的 GIF 已证明，这些样式会改变文本可用宽度与字形度量，导致临界标题在两行和三行之间重排。

目标：

- active 切换期间，所有目录项的宽度、高度、位置和换行结果保持不变。
- 点击目录项后，点击意图与页面滚动观察不会相互抢写。
- 滚动结束后的 active 必须对应实际章节，不能依赖固定动画时长。
- 目录内部为了揭示 active 项而滚动时，不得带动页面视口。
- inactive 与 active 文本在浅色玻璃面板上满足正常字号至少 `4.5:1` 的对比度。
- 保留现有轨道、悬停展开、固定/取消固定、移动端 Drawer 和三栏布局。

## 已验证根因

### 1. active 样式不是布局中性的

当前二级标题从 inactive 的 `padding-left: 18px; font-weight: 400` 切到 active 的 `padding-left: 14px; font-weight: 650`，并对 `font-weight` 做 `180ms` 过渡。

真实文章中，“Run your first inference with the Responses API” 在点击后出现：

```text
66.59px → 48.39px → 66.59px
```

GIF 中后续项目同步出现约 `18px` 的单帧上移再恢复。因此仅统一 `white-space: normal` 不足以消除抖动。

### 2. scrollspy 混用了两个坐标系

当前章节判定将标题的 `offsetTop` 与 `window.scrollY` 比较。标题 `offsetTop` 相对正文定位祖先，而 `window.scrollY` 属于文档坐标。真实页面中两者相差约 `136px`。

点击 “Get started with GPT-5.6 on Amazon Bedrock” 后，active 先正确设为第 4 项，约 `1.06s` 后错误切到第 5 项。

### 3. 900ms 锁不是完成条件

不同距离、浏览器和用户设置下，平滑滚动时长不同。固定 `900ms` 可能提前释放，也可能在用户已经中断滚动后继续阻止正常 scrollspy。

### 4. `scrollIntoView` 的滚动域过宽

目录列表是独立滚动容器，但 `activeLink.scrollIntoView()` 可以滚动多个祖先，包含页面视口。active 自动揭示应只修改目录容器的 `scrollTop`。

## 方案比较

### 方案 A：仅冻结 CSS 几何

移除 active 的 padding 和字重变化，只保留颜色与圆点。

- 优点：改动最小，立即消除 GIF 中的 18px 闪跳。
- 缺点：仍保留坐标系错误、900ms 超时和内部滚动反馈，active 仍可能错选。

### 方案 B：布局中性样式 + 独立 scrollspy 状态逻辑（采用）

冻结 active 几何，并把滚动状态提取为可测试的 composable。点击目标、观察章节与最终展示章节使用明确的数据流；滚动完成采用实际位置/滚动静止条件。

- 优点：同时修复视觉抖动和状态错选；可通过单元测试覆盖完整生命周期；改动集中。
- 缺点：比纯 CSS 补丁多一个局部 composable。

### 方案 C：全面迁移到 IntersectionObserver

使用 IntersectionObserver 重建章节判定。

- 优点：不需要高频 scroll handler。
- 缺点：根边距、短章节、快速跨越多个标题和文档底部的选中规则仍需额外状态；对本次 18 个标题的目录属于不必要重构。

## 采用的组件边界

### `DetailToc.vue`

职责：

- 渲染桌面轨道、展开面板和移动端 Drawer。
- 管理 hover、focus、pin、dismiss 等披露状态。
- 消费 scrollspy 提供的 `activeId` 与 `scrollToHeading()`。
- 在 active 改变时，仅滚动 `.toc-list-shell` 以揭示目录项。

### `useTocScrollSpy.ts`

职责：

- 维护当前观察章节 `observedId`。
- 维护用户点击期间的 `pendingTargetId`。
- 派生唯一供界面使用的 `activeId = pendingTargetId ?? observedId`。
- 使用统一的视口坐标计算当前章节。
- 对 scroll 处理做 `requestAnimationFrame` 合帧。
- 在目标到达顶部偏移、页面到达底部或滚动真实停止后清理 pending。
- 用户通过 wheel、touch 或导航键中断时，立即取消 pending 并恢复实际观察状态。
- 注册并清理 scroll、scrollend、用户中断、resize 与计时器资源。

组件不新增全局 store，也不改变 `DetailToc` 的 props/emits 公共接口。

## 滚动状态设计

### 统一坐标

章节判定只使用视口坐标：

```ts
heading.getBoundingClientRect().top <= activationOffset
```

不再将 `offsetTop` 与 `window.scrollY` 混合比较。点击目标位置继续使用：

```ts
heading.getBoundingClientRect().top + window.scrollY - navigationOffset
```

### 点击流程

1. 设置 `pendingTargetId`。
2. `activeId` 立即稳定显示点击目标。
3. 根据 `prefers-reduced-motion` 选择 `smooth` 或 `auto`。
4. 滚动期间持续更新 `observedId`，但不覆盖 pending 的视觉状态。
5. 目标到达偏移线、页面到达最大滚动位置，或滚动停止后清除 pending 并同步实际章节。

`scrollend` 只作为可用时的增强；不支持时使用“最后一次实际 scroll 事件后的短暂静止”作为 fallback，而不是从点击开始计算固定总时长。

### 用户中断

在 pending 期间收到 wheel、touchmove 或 PageUp/PageDown/Home/End/方向键时，取消 pending；下一帧按实际页面位置决定 active。这样不会在用户夺回控制后继续锁住错误项。

### 目录内部揭示

当 active 链接超出 `.toc-list-shell` 可视区时，直接计算最近边缘所需的 `scrollTop`。不得调用 `activeLink.scrollIntoView()`，不得改变 `window.scrollY`。

## 视觉与颜色

### 布局中性 active

active 与 inactive 必须共享：

- 相同的 `display`
- 相同的 padding
- 相同的字号、字重和行高
- 相同的 white-space、overflow-wrap 与文本宽度

active 仅改变不会触发布局的属性：

- 文字颜色
- 可选的低透明背景色
- 绝对定位圆点的 opacity/transform

圆点区域由所有目录项共同预留，active 不再改写链接左内边距。移除 `font-weight` 过渡。

### 色彩角色

浅色主题：

- `--toc-text-muted: #686868`：inactive 文本；在 `#f6f6f5` 上约 `5.15:1`。
- `--toc-accent-text: #347a4e`：active 文本；在 `#f6f6f5` 上约 `4.81:1`。
- `--toc-accent-decorative: #81c995`：圆点与 active 轨道刻度。
- rail idle 继续由中性色以低透明度派生，不作为文字色来源。

深色主题继续沿用高对比度浅色文本与 `#c0e0c7` active 颜色，但也拆分文字和装饰 token，避免未来互相耦合。

`#c1c1c1` 在浅色面板上的对比度约 `1.66:1`，仅适合非文字装饰刻度，不用于 13px 目录标签。

## 测试设计

### 纯逻辑测试

为 scrollspy 增加以下失败用例后再实现：

- positioned 正文容器下，使用文档/视口坐标仍选中正确章节。
- 点击期间的中间 scroll 事件不覆盖 pending 目标。
- 目标到达后清理 pending，并保持正确 active。
- 不支持 `scrollend` 时由滚动静止 fallback 完成，而不是固定 900ms。
- 用户 wheel/键盘中断后立即恢复实际章节。
- titles 替换时清理失效的 observed/pending id。
- 卸载时清理所有监听器、rAF 与计时器。

### 组件测试

- 点击调用正确的 `window.scrollTo` 偏移和 reduced-motion 行为。
- active 在目录可视范围内时，shell 与 window 均不滚。
- active 超出目录可视范围时，只改变 shell。
- 移动端点击后关闭 Drawer 的行为不回归。

### 样式契约

active 链接规则不得包含：

- `padding` / `margin`
- `font-size` / `font-weight` / `line-height`
- `display`
- `white-space`
- 会改变宽高或换行的 transition

真实浏览器最终验证长标题切换前后每个目录项的 `height` 和后续项 `top` 保持一致，并复查浅色、深色、reduced-motion 与长距离跳转。

## 非目标

- 不重做桌面目录的 hover/pin/Escape 披露模型。
- 不修改移动端 Drawer 视觉。
- 不修改文章标题提取范围或三栏详情布局。
- 不修改首页 `ArticleTocDemo.vue` 的演示交互。
- 不新增第三方依赖。
