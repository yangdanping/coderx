# Shape 3D 背景实现说明

这个目录负责把原本的二维装饰图形做成立体、缓慢运动的 Three.js 背景。

它不是页面内容的一部分，也不会接收鼠标事件。即使浏览器不支持 WebGL、首次渲染失败，或者运行中丢失 WebGL 上下文，页面仍会显示原来的 SVG 背景，不会出现空白。

## 快速查看

该功能已经在 [`App.vue`](../../../App.vue) 中全局挂载。启动项目后即可看到：

```bash
pnpm install
pnpm run dev
```

浏览器中切换浅色/深色主题、改变窗口宽度，或切换到其他标签页，可以观察背景的主题滤镜、响应式性能配置和暂停/恢复行为。

## 背景分成哪些层

从页面最底部到内容层，顺序如下：

```text
z-index: -4  原始 bg.svg，WebGL 未就绪时的完整兜底
z-index: -3  GlobalBackground3D，六个全局立体装饰物
z-index: -2  BackgroundTriangle3D，原有三角箭头
z-index: -1  纸张颗粒纹理
z-index:  0+ 页面内容、导航栏、弹窗等
```

`App.vue` 使用 `isolation: isolate` 建立自己的层叠上下文，因此这些负层级背景不会掉到整个页面之外。

全局 3D 背景完成第一帧后，会通过 `ready-change` 通知 `App.vue`，随后淡出 `bg.svg`。如果运行期发生错误，状态会重新变为未就绪，SVG 兜底立即恢复。

## 目录结构

```text
shape-3d/
├── config/
│   ├── global-background3d.config.ts  # 六个全局物体、材质和性能参数
│   ├── glyph3d.config.ts              # 立体字形配置
│   └── index.ts                       # 对外导出
├── global/
│   ├── GlobalBackground3D.vue         # Vue 生命周期、就绪状态和画布层
│   ├── global-background3d.ts         # 几何体、材质、轮廓和运动姿态
│   ├── global-background3d-runtime.ts # Renderer、相机、循环、事件和清理
│   └── test/                          # 全局背景测试
├── triangle/
│   ├── BackgroundTriangle3D.vue       # 原有三角箭头及它自己的 SVG 兜底
│   ├── triangle3d.ts                  # 三角箭头几何体和运动算法
│   ├── triangle3d-runtime.ts          # 三角箭头独立运行时
│   └── test/
├── glyph/
│   ├── glyph3d.ts                     # 把字形轮廓挤出成立体对象
│   ├── glyph3d-outline.ts             # 解析 SVG 字形轮廓
│   ├── outlines/                      # 三种美元符号 SVG 轮廓
│   ├── preview/                       # 字形开发预览
│   └── test/
└── README.md
```

## 全局六对象背景是怎样工作的

### 1. 配置描述“画什么”

[`global-background3d.config.ts`](./config/global-background3d.config.ts) 是主要调整入口。

`GLOBAL_SHAPE_DESCRIPTORS` 中的每一项描述一个物体：

- `geometry`：二维轮廓，目前支持圆形、圆角矩形和拱形。
- `depth`：向 Z 轴挤出的厚度。
- `position`：在 1400 × 800 设计坐标系中的位置。
- `rotationDegrees`：初始三轴旋转角度。
- `color`、`opacity`：颜色和透明度。
- `motion`：旋转型 `spin` 或小幅往返型 `pace`。

坐标原点位于画面中心：

```text
X 为正：向右
Y 为正：向上
Z 为正：靠近相机
```

六个物体的职责如下：

| ID | 形状 | 动作 |
| --- | --- | --- |
| `blue-puck` | 蓝色圆片 | 小幅位移和倾斜 |
| `neutral-puck` | 浅色圆片 | 小幅位移和倾斜 |
| `green-slab` | 大型绿色圆角板 | 缓慢连续旋转 |
| `yellow-arch` | 黄色拱形 | 缓慢连续旋转 |
| `neutral-pill` | 浅色胶囊 | 小幅位移和倾斜 |
| `green-cube` | 绿色圆角块 | 小幅位移和倾斜 |

### 2. 几何模块负责“做成立体物体”

[`global-background3d.ts`](./global/global-background3d.ts) 的处理过程是：

```text
配置中的二维轮廓
        ↓
Three.js Shape
        ↓
ExtrudeGeometry 挤出厚度
        ↓
MeshStandardMaterial 正面/侧面材质
        +
LineSegments2 前后盖轮廓线
        ↓
Group，可统一设置位置和旋转
```

几何体创建后会被移动到自己的局部原点。这样配置中的 `position` 只控制世界位置，不会受到轮廓原始坐标的干扰。

轮廓线只绘制前后两个面的边界，不绘制连接前后面的竖线，因此视觉上仍然接近原 SVG，而不会变成线框模型。

每个对象拥有自己的几何体和材质，并提供幂等的 `dispose()`。即使某个资源释放时报错，其余资源仍会继续释放。

### 3. 运行时负责“把它稳定地画出来”

[`global-background3d-runtime.ts`](./global/global-background3d-runtime.ts) 为六个对象共用：

- 一个透明的 `WebGLRenderer`
- 一个正交相机
- 一个场景
- 一组环境光和方向光
- 一个动画循环

正交相机不会产生近大远小的透视变形，更适合还原 SVG 装饰图形。

相机按照原始 `bg.svg` 的 1400 × 800 设计尺寸计算 `center/cover` 可见区域。因此无论横屏还是竖屏，裁切方式都和 CSS 的 `background: center/cover` 保持一致。

### 4. Vue 组件负责“接入页面”

[`GlobalBackground3D.vue`](./global/GlobalBackground3D.vue) 只做三件事：

1. 组件挂载时创建运行时。
2. 第一帧完成后发出 `readyChange(true)`。
3. 不可用或卸载时恢复未就绪状态并清理运行时。

复杂的 Three.js 逻辑没有放进 Vue 响应式系统，避免每一帧都触发 Vue 更新。

## 渲染与性能设计

性能配置同样位于 `GLOBAL_BACKGROUND_CONFIG`：

| 场景 | 最大帧率 | DPR 上限 | 位移幅度 | 倾斜幅度 |
| --- | ---: | ---: | ---: | ---: |
| 宽度大于 767px | 30 FPS | 1.5 | 100% | 100% |
| 宽度不大于 767px | 24 FPS | 1.25 | 60% | 75% |

这里限制的是装饰背景，而不是页面主动画。降低帧率和 DPR 能明显减少手机上的 GPU 像素填充量，同时保留缓慢运动的感觉。

运行时还有以下保护：

- 页面进入后台时停止动画循环。
- 回到前台时扣除隐藏时间，物体不会突然跳跃。
- `prefers-reduced-motion: reduce` 生效时只渲染静态姿态。
- resize 时复用原对象，只更新相机、Renderer 尺寸和轮廓分辨率。
- 首帧失败、后续渲染失败、resize 失败或 WebGL 上下文丢失时，停止循环、释放资源并恢复 SVG。

## SVG 兜底为什么保留

原背景定义在 [`common.scss`](../../../assets/css/common.scss)：

```scss
--bg: url('@/assets/img/bg.svg') center/cover no-repeat fixed;
```

SVG 是可靠的最终兜底，而不是需要删除的旧实现：

- JavaScript 尚未执行时，它先显示。
- WebGL 初始化失败时，它继续显示。
- WebGL 运行期失效时，它重新显示。
- 3D 第一帧真正完成后，它才淡出。

这也避免了 Canvas 初始化期间出现背景闪白。

三角箭头采用相同思路，但它拥有独立的 Canvas 和独立的内联 SVG 兜底。全局六对象与三角箭头不要合并到同一个运行时，否则其中一部分失败会影响另一部分，而且会增加改动原箭头视觉的风险。

## 如何修改

### 调整现有物体

直接修改 `GLOBAL_SHAPE_DESCRIPTORS` 对应项：

```ts
{
  id: 'green-cube',
  position: [-287, -313, 0],
  rotationDegrees: [-5, 5, -2],
  opacity: 0.68,
  motion: {
    tier: 'pace',
    durationMs: 19_000,
    phase: Math.PI * 1.5,
    travel: [10, 8],
    tiltDegrees: [6, 6, 2],
  },
}
```

- 想移动位置：改 `position`。
- 想改变初始朝向：改 `rotationDegrees`。
- 想让运动更慢：增大 `durationMs`。
- 想减小移动范围：减小 `travel`。
- 想让大物体反向旋转：改变 `turns` 的正负号。

### 添加一个同类物体

1. 给 `GlobalShapeId` 增加唯一 ID。
2. 在 `GLOBAL_SHAPE_DESCRIPTORS` 增加描述项。
3. 更新依赖固定对象数量或 ID 顺序的测试。
4. 运行聚焦测试并在浏览器检查宽屏和窄屏裁切。

如果只是圆形、圆角矩形或拱形，不需要修改运行时。

### 添加一种新形状

1. 在 `GlobalGeometryConfig` 中增加新的联合类型。
2. 在 `createShape()` 中把配置转换成 Three.js `Shape`。
3. 为尺寸、有限坐标、局部居中和资源释放补测试。

不要直接在运行时中创建几何体。几何构建和 Renderer 生命周期应保持分离。

### 调整统一质感

修改 `GLOBAL_BACKGROUND_CONFIG.material`：

- `capOpacity`：正反面透明度。
- `sideOpacity`：侧面透明度。
- `outlineOpacity`：轮廓线透明度。
- `outlineWidth`：屏幕空间线宽。
- `roughness`：粗糙度，越高越接近柔和塑料。
- `metalness`：金属度，当前保持为 0。

### 修改三角箭头

三角箭头的形状入口是 [`triangle3d.ts`](./triangle/triangle3d.ts) 中的 `TRIANGLE_SHAPE_CONFIG`，运行和降级逻辑位于 [`triangle3d-runtime.ts`](./triangle/triangle3d-runtime.ts)。

它与全局六对象是两个独立功能。修改时应分别运行对应测试，避免无意改变箭头路径和原有动画。

### 使用字形工具

`glyph/` 是独立的 SVG 字形转 3D 工具，目前固定字形为 `$`，支持：

- `rounded`
- `display`
- `serif`

通过 [`glyph3d.config.ts`](./config/glyph3d.config.ts) 选择轮廓样式，再使用 `createGlyphObject()` 创建对象。`getGlyphFallback()` 可以取得相同轮廓的 SVG fallback 信息。

## 测试与验证

只运行本目录相关测试：

```bash
pnpm exec vitest run src/components/background/shape-3d
```

运行全局背景及其 SVG/CSS 契约测试：

```bash
pnpm exec vitest run \
  src/components/background/shape-3d/global \
  src/components/background/shape-3d/triangle \
  src/assets/img/test/bg-svg-contract.test.ts \
  src/assets/css/test/common-background.test.ts
```

提交前建议至少运行：

```bash
pnpm run type-check
pnpm exec eslint src/App.vue src/components/background/shape-3d
pnpm run build-only
```

测试重点包括：

- 几何尺寸、局部居中和有限坐标。
- 材质、透明度和盖面轮廓。
- `center/cover` 相机计算。
- 桌面/窄屏性能配置。
- 动画周期、隐藏标签页和减少动态效果。
- 首帧及运行期失败后的 SVG 回退。
- 监听器、Renderer、几何体和材质的完整释放。
- 原始 `bg.svg` 和三角箭头契约没有被意外修改。

## 常见问题

### Canvas 已创建，但页面仍显示 SVG

只有成功渲染第一帧后才会淡出 SVG。检查浏览器是否支持 WebGL，以及运行时是否进入了失败回退。

### 背景变成黑色

Renderer 必须使用透明画布，并以透明颜色清屏：

```ts
new WebGLRenderer({ alpha: true })
renderer.setClearColor(0x000000, 0)
```

### 改变窗口后轮廓线变粗或变细

`LineMaterial` 使用屏幕空间线宽。resize 时必须同步更新每个 `outlineMaterial.resolution`。

### 手机发热或耗电增加

先确认没有移除窄屏 FPS/DPR 限制，也不要绕过 `setAnimationLoop(null)` 的后台暂停逻辑。背景动画不需要追求 60 FPS。

### 修改位置后手机上看不到物体

这是 `center/cover` 裁切的正常结果。物体位置以 1400 × 800 设计画布为准，竖屏会裁掉较多左右区域。不要为了让所有装饰物都出现在手机上而把它们移动到正文安全区。

### 页面切换后 WebGL 上下文越来越多

确认组件卸载时调用了运行时的 `dispose()`，并确保新建的几何体、材质或监听器都被加入资源清理流程。

## 相关设计文档

- [全局 3D 背景设计](../../../../docs/superpowers/specs/2026-07-16-global-3d-background-design.md)
- [全局 3D 背景实施计划](../../../../docs/superpowers/plans/2026-07-16-global-3d-background.md)
