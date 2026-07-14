# 参数化等边 3D 箭头设计

## 背景与目标

当前圆角箭头的三处外顶点边长约为 `121 / 93 / 101`，轮廓本身不是等边三角形。持续的 X/Y/Z 三轴自旋又会在屏幕投影中进一步放大比例差异，因此部分姿态看起来较扁或偏斜。

本次将手写路径坐标改为参数化轮廓生成器。默认轮廓以等边三角形为外部基准，同时保留明显内凹箭尾、圆角、轻微厚度和现有三轴自旋。开发者可通过一组语义化常量调整整体比例，不需要直接修改多个贝塞尔控制点。

现有公转圆心、半径、方向、起点、周期、厚度、颜色常量、描边、材质、自旋速度和运行时生命周期保持不变。

## 开发者形状参数

在 `triangle3d.ts` 中导出配置类型和默认配置：

```ts
export interface TriangleShapeConfig {
  sideLength: number;
  heightScale: number;
  tipSkew: number;
  notchDepth: number;
  cornerRadius: number;
}

export const TRIANGLE_SHAPE_CONFIG = {
  sideLength: 112,
  heightScale: 1,
  tipSkew: 0,
  notchDepth: 22,
  cornerRadius: 10,
} as const satisfies TriangleShapeConfig;
```

参数语义：

- `sideLength`：等边基准的边长，同时控制整体尺寸。
- `heightScale`：标准等边高度的倍率；`1` 为等边，低于 `1` 更扁，高于 `1` 更修长。
- `tipSkew`：箭尖相对中心线的横向偏移；`0` 保持对称，正负值允许开发者主动制造方向偏移。
- `notchDepth`：底边中点朝箭尖方向内缩的距离，决定箭尾凹口深度。
- `cornerRadius`：外顶点和内凹转折的圆角距离；生成器会根据相邻边长自动限制最大值，避免路径反折。

这些参数是源码级开发者入口，不在运行时提供 UI 控件，也不引入响应式配置。

## 几何生成

先在规范化坐标中构造尖端朝上的三角形：

```text
equilateralHeight = sideLength × √3 / 2
height = equilateralHeight × heightScale

tip         = (tipSkew, -2 × height / 3)
bottomRight = (sideLength / 2, height / 3)
bottomLeft  = (-sideLength / 2, height / 3)
```

当 `heightScale = 1` 且 `tipSkew = 0` 时，三个外顶点构成精确等边三角形。箭尾凹点从 `bottomRight` 与 `bottomLeft` 的中点向 `tip` 移动 `notchDepth`。

规范化轮廓整体围绕当前 `TRIANGLE_CENTER` 旋转约 `58°`，使箭尖继续指向右上。该方向角为内部视觉常量，不加入开发者配置，避免形状比例和运动姿态产生重复控制入口。

将 `[tip, bottomRight, notch, bottomLeft]` 视为一个凹四边形。对每个转角计算沿前后相邻边的进入点和离开点，再用二次贝塞尔曲线连接。圆角距离取配置值与相邻边允许值中的较小者，因此较大的 `cornerRadius` 不会越过短边中点。

同一组生成后的路径命令继续同时驱动：

- Three.js `Shape` 与挤出几何。
- `TRIANGLE_FALLBACK_PATH` 的 SVG `d` 属性。

不在 Vue fallback 中维护第二份坐标。

## 3D 姿态与动画边界

默认轮廓正面接近等边，但真实 3D 物体在 X/Y 方向倾斜后，屏幕投影必然不再保持三边等长。本次保留现有完整三轴自旋，让形变继续表达体积，而不是把动画约束为始终正对相机。

保持以下内容不变：

- `STATIC_ROTATION`：X `8°`、Y `-12°`、Z `0°`。
- X/Y/Z 自旋速度范围与独立随机方向。
- `TRIANGLE_TOTAL_DEPTH = 24`。
- `TRIANGLE_WORLD_POSITION`、`ORBIT_CENTER`、`ORBIT_OFFSET` 和 `ORBIT_DURATION_MS`。
- `calculateContinuousPose()` 的 position 计算。

## 接口与文件边界

### `triangle3d.ts`

- 新增并导出 `TriangleShapeConfig` 与 `TRIANGLE_SHAPE_CONFIG`。
- 以纯函数根据配置计算外顶点、凹点、圆角路径和 SVG path。
- `createTriangleShape()` 使用默认配置生成 Three.js 轮廓。
- `TRIANGLE_FALLBACK_PATH` 使用同一默认配置生成。
- 颜色和描边继续读取 `TRIANGLE_BODY_COLOR` 与 `TRIANGLE_OUTLINE_COLOR`。

### `BackgroundTriangle3D.vue`

无需修改。它已经绑定 `TRIANGLE_FALLBACK_PATH` 和共享颜色常量，会自动获得参数化后的轮廓。

### 其他文件

不修改 `triangle3d-runtime.ts`、`App.vue` 或 `bg.svg`。

## 测试与验证

先增加失败测试，再实现生成器。

自动化测试覆盖：

1. 默认配置为 `112 / 1 / 0 / 22 / 10`。
2. 默认三个外顶点的三条边在浮点误差内等长。
3. `heightScale` 能改变高度且不改变基准宽度，`tipSkew` 能改变对称性。
4. `notchDepth` 能改变凹点位置，默认轮廓仍同时包含顺时针与逆时针转折。
5. `cornerRadius` 生成曲线命令，并被短边安全限制。
6. WebGL 和 fallback 继续由同一个默认配置生成。
7. 几何厚度、颜色、描边、初始姿态、公转、自旋、降级和资源释放测试继续通过。

真实页面分别检查浅色和深色主题：

- 刷新首帧时三处外顶点呈现更均衡的等边观感。
- 箭尖继续指向右上，内凹箭尾清楚且不过深。
- 圆角连续，没有尖角、折返、破面或轮廓穿插。
- 自旋后允许出现自然的投影压缩，但不能因路径错误产生突然的比例跳变。
- 现有公转轨迹和离屏节奏不变。

最终运行相关 Vitest、完整 Vitest、类型检查、相关 ESLint、生产构建和 `git diff --check`。

## 非目标

- 不让 3D 箭头在所有倾斜角度都维持屏幕等边。
- 不限制或重写三轴自旋。
- 不暴露原始顶点、贝塞尔控制点、方向角或公转参数。
- 不增加运行时形状编辑器、Vue props、CSS 变量或设置面板。
- 不改变颜色、透明度、线宽、材质、厚度或页面图层。
