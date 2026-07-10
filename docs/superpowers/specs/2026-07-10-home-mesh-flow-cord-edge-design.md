# 首页弥散渐变与 Flow 拉绳顶边衔接设计

## 目标

修复两个仅涉及视觉衔接的桌面端问题，同时保持现有内容布局、导航交互和未来替换 Flow 拉绳交互的空间：

1. 首页由五层 `radial-gradient` 组成的彩色弥散 mesh 应覆盖 fixed Header 原占位区域，不再在 Header 下沿出现颜色断层。
2. Flow 页拉绳在收起与展开状态都应从浏览器内容视口顶边开始，且不得遮挡 Navbar 的点击区域。

## 现状与根因

### 首页弥散 mesh

`App.vue` 为非编辑路由根节点添加 `padding-top: var(--navbarHeight)`。首页标题区另有 `--hero-mesh-offset-top`，其伪元素目前只向上抵消标题区 margin，因此伪元素上沿恰好停在 Header 下沿。Header 在滚动顶部透明时，Header 上方只显示全局 SVG 与纸纹，Header 下方额外叠加彩色 mesh，形成硬切。

### Flow 拉绳

拉绳使用 `position: fixed`，锚点为 `top: calc(var(--navbarHeight) - 6px)`。收起态通过 `translateY(-40%)` 偶然越过顶边，但展开态 `translateY(0)` 后重新从 Header 下沿开始。Navbar 的层级为 900，拉绳为 600，因此拉绳可以延伸进 Header 区域而不抢占导航点击。

## 采用方案

### 1. 只扩展首页 mesh 的上边界

将首页 mesh 伪元素的 `top` 从只抵消标题 offset，改为同时抵消标题 offset 与 `--navbarHeight`：

```scss
top: calc(-1 * var(--hero-mesh-offset-top) - var(--navbarHeight));
```

不修改路由 padding、不移动 Hero 内容、不修改 `bg.svg` 几何装饰。使用现有 CSS 变量适配桌面 56px 与窄屏 rem 换算后的 Header 高度。

### 2. 将 Flow 拉绳锚点移到视口顶边

将 `.flow-cord-outside` 的 fixed `top` 改为 `0`。保留现有展开/收起 transform、横向定位、自定义 props 与层级关系。Navbar 继续覆盖在拉绳之上，确保其按钮优先响应指针事件。

## 未采用方案

- 不把 mesh 移到全局 App 背景：它是首页专属视觉，会污染其他页面。
- 不移除全局路由 Header padding：会移动所有页面内容并影响锚点。
- 不为 Flow 额外绘制一段假绳线：虽然能保留坠子原高度，但会增加临时交互的结构和维护成本。
- 不提升拉绳 z-index：会让拉绳按钮覆盖 Navbar 操作区。

## 响应式与可访问性

- 两项均使用现有 CSS 变量与定位上下文，不硬编码桌面 Header 高度。
- 在 320、390、768 与桌面宽度检查无横向溢出。
- 拉绳保持在 Navbar 下层；本次不扩大其点击热区，也不改变横向锚点，以免混入无关范围。
- 保留首页 `prefers-reduced-motion` 行为，mesh 关闭动画时也应无断层。
- 保留明暗主题的现有 mesh 色值，仅改变覆盖范围。

## 组件边界

- `Home.vue`：仅负责首页 Hero mesh 的视觉范围。
- `FlowCordWidget.vue`：仅负责拉绳自身的 fixed 定位与显隐动画。
- `App.vue`、`NavBar.vue`：不改动，作为现有布局与层级契约。

## 测试与验收

先添加源码契约测试并观察失败，再做最小 CSS 修改：

1. 首页测试断言 mesh 的 top 同时包含 `--hero-mesh-offset-top` 与 `--navbarHeight`。
2. Flow 拉绳测试断言 fixed 锚点为 viewport top，且继续使用 `--z-sticky`。
3. 运行相关 Vitest、ESLint、`vue-tsc` 与生产构建。
4. 在真实浏览器验证：
   - scrollY=0 时首页 mesh 在 y=0 即存在，Header 下沿无突变；
   - Flow 拉绳收起和展开时线均从 y=0 开始；
   - Navbar 区域命中目标仍是导航控件；
   - 390、768 与桌面视口无布局回归。

