# 首页角色 X 亚克力立体材质设计

## 目标

把首页动态角色标题末尾的 X 从平面渐变描边升级为与全局 3D 背景物体一致的“有描边、半透明、带厚度的亚克力塑料”材质，同时完整保留：

- `CoderX`、`WriterX`、`CreatorX`、`BuilderX` 的现有渐变色和 stop 位置。
- 标题扰动过程中目标字符格里的日文、符号等瞬时字符。
- 当前标题占位宽度、基线、响应式布局和屏幕阅读器标签。

鼠标跟随是可选能力。开启时，亚克力字符在可读范围内朝鼠标轻微偏转；关闭、触摸设备或用户启用减少动态效果时，字符按可配置默认朝向静态展示。

## 方案比较

### 方案 A：CSS 多重 text-shadow

用多层阴影模拟厚度，成本最低，但无法稳定实现透明正面、渐变侧边和干净的亚克力高光。扰动字符可以继承，材质一致性不足。

### 方案 B：分层 SVG 亚克力字形（采用）

对当前字符同时绘制背层、若干厚度层、正面和高光层。每层都使用当前扰动字符，因此任何瞬时字符都能同步获得相同材质。渐变由既有角色 token 驱动，鼠标位置只改变轻量的响应式数值和 CSS 变量。

该方案不需要为每个扰动字符生成几何体，也不会为一个标题字符引入新的 WebGL renderer。

### 方案 C：Three.js 真 3D 字形

可实现完整 360° 旋转和真实侧面，但必须在字符变化时取得字体轮廓并重新挤出几何体。它会增加字体轮廓资产、渲染器生命周期、移动端性能和 fallback 复杂度，不适合快速扰动的标题字符。

## 组件边界

### `ScrambleFrameText.vue`

继续负责稳定字符格、扰动字符数据和外层可访问名称，并新增亚克力材质及朝向控制参数：

- `accentAcrylic?: boolean`：启用亚克力分层；默认 `false`，避免影响其它使用者。
- `accentFollowPointer?: boolean`：启用鼠标跟随；默认 `false`。
- `accentDefaultTiltX?: number`：默认纵向倾角。
- `accentDefaultTiltY?: number`：默认横向倾角。
- `accentDepthX?: number`、`accentDepthY?: number`：默认厚度延伸方向。
- `accentMaxPointerTilt?: number`：鼠标跟随的最大附加角度。

组件在整个角色词范围内监听 pointer move，使用户无需精确悬停在 X 上。事件通过 `requestAnimationFrame` 合并；pointer leave 时平滑回到默认朝向。

### `ScrambleAcrylicGlyph.vue`

新建仅负责视觉的 SVG 子组件，接收当前字符、渐变 stop 位置和深度向量，输出：

1. 背层：较低透明度的渐变轮廓。
2. 厚度层：沿深度向量均匀分布的字符副本，形成连续侧面。
3. 正面：低透明度渐变填充与清晰渐变描边。
4. 高光：偏向左上方的半透明白色细描边。

所有内部 SVG 节点保持 `aria-hidden="true"`；外层 `ScrambleFrameText` 的 `aria-label` 仍是唯一朗读内容。渐变 ID 继续使用 `useId()` 保证实例隔离。

### `Home.vue`

- 可见标题启用 `accent-acrylic` 和 `accent-follow-pointer`。
- 隐形宽度尺启用亚克力视觉但关闭 pointer follow，确保占位几何一致且不增加无效交互。
- 首页显式配置默认朝向和深度方向；组件默认值作为其它页面的安全 fallback。
- 四个角色仍只映射既有渐变 start/end token，不创建新的角色色板。

## 朝向与交互

默认朝向表现为正面略向右、略向上偏转，厚度向右下延伸，与背景亚克力物体的光照阅读方向一致。

开启鼠标跟随时：

- 鼠标相对角色词中心的归一化坐标映射到 `rotateX` / `rotateY`。
- 最大附加倾角受 `accentMaxPointerTilt` 限制，避免字形变窄或影响识别。
- 厚度向量随偏转做小幅反向补偿，强化“物体朝向变化”而不是平面位移。
- pointer leave 后回到配置朝向。

以下情况自动使用静态默认朝向：

- `accentFollowPointer` 为 `false`。
- `(pointer: fine)` 不匹配。
- `prefers-reduced-motion: reduce`。

## 材质与视觉约束

- 正面保持低透明度，背景网格和色彩应能透过，但不能完全消失。
- 描边仍为当前角色渐变，推荐视觉粗细维持约 1.5px。
- 厚度层比正面更低透明，避免堆叠后变成实心粗字。
- 高光仅增强左上边缘，不使用大面积模糊辉光。
- 不增加布局阴影，不改变标题字体、字号、字符格宽度或右侧安全留白。
- 浅色和深色主题使用同一色板，通过透明度而非另一套颜色适配。

## 状态和数据流

`useWallHitScramble()` 继续输出当前 `frame` 和稳定 `target`。`ScrambleFrameText` 从 `frame` 取目标索引处的当前字符，并原样传给 `ScrambleAcrylicGlyph`。因此扰动帧和稳定 X 使用完全相同的渲染路径，没有第二套计时或字符状态。

pointer 位置只影响当前组件实例的朝向状态，不写入 store，不影响 Retro 屏幕文本，也不会触发标题扰动逻辑。

## 性能与清理

- 每个可见亚克力字形固定渲染少量 SVG text 层，不随帧创建 DOM 数量。
- pointer move 通过单个待处理的 animation frame 合并。
- 组件卸载时取消未执行的 animation frame。
- 隐形宽度尺不注册 pointer move。
- 不引入依赖，不创建 Canvas 或 WebGL context。

## 测试与验收

### 组件测试

- 默认消费者不渲染亚克力 SVG。
- 开启亚克力后，正面、厚度和高光层都显示当前扰动字符，而不是写死 X。
- 每个实例的所有渐变 ID 唯一。
- pointer follow 关闭时使用配置朝向。
- pointer follow 开启时，pointer move 更新朝向，pointer leave 恢复默认值。
- reduced motion 和非 fine pointer 保持默认朝向。
- 组件卸载后无遗留 animation frame。

### 首页测试

- 可见标题开启亚克力和 pointer follow。
- 隐形宽度尺开启亚克力但关闭 pointer follow。
- 四个角色精确复用现有 RGBA 色值和 stop 位置。
- 标题宽度、间距和响应式规则不回归。

### 浏览器验收

- 桌面浅色和深色主题下，X 与扰动字符均呈现半透明正面、渐变边缘和可辨识厚度。
- 鼠标从角色词四角移动时，朝向连续变化且不超过可读范围。
- 鼠标离开后回到默认朝向。
- 390px 移动端保持静态默认朝向，无横向溢出或裁切。
- 减少动态效果模式下无跟随动画。

## 非目标

- 不提供 360° 自由旋转。
- 不把标题 X 加入全局 Three.js 背景场景。
- 不改变其它标题字符的像素字体或扰动算法。
- 不修改背景物体、Retro 电脑或首页其它区块。
