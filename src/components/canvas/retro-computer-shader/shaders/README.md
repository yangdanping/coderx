# RetroComputerShader 入门说明

这份文档给前端同学看：从 **不懂 shader** 到 **能自己调参数**。

---

## 1. 这个 shader 做了什么

用 GPU 上的 **Fragment Shader** 在每个像素上绘制一台 **brutalism 风格的 CRT 线框电脑**。
所有图形都由 **SDF（有符号距离场）** 计算得到，不使用任何纹理或模型。

核心流程：

1. Vue 组件通过 `uniform` 把参数（时间、yaw、pitch、颜色、缩放等）传给 GPU。
2. 片段着色器对每个像素执行：**3D 等距投影 → SDF 距离计算 → 描边/填充 → 多层 alpha-over 合成输出**。

---

## 2. 目录里两个文件各干什么

### `vertex.glsl`

铺一张全屏矩形（两个三角形组成的四边形），让每个像素都能执行 `fragment.glsl`。

### `fragment.glsl`

真正做视觉效果的核心：

| 区块                     | 功能                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| **SDF Primitives**       | 线段、圆、矩形的有符号距离函数                                                                          |
| **Drawing Helpers**      | `stroke()`（描边）、`fill()`（填充）、`cross2()`（叉积）                                                |
| **Glow Stroke**          | `sg()`（荧光描边，三层叠加：核心线 + 内 glow + 外 halo，随时间呼吸）、`sgW()`（弱版描边，用于次要线条） |
| **Alpha-Over 合成**      | `overPre()`（预乘 alpha-over，用于多颜色层叠加输出）                                                    |
| **Isometric Projection** | `isoProj()` — 3D 点 → 2D 屏幕坐标（yaw + pitch 旋转）                                                   |
| **CRT Monitor**          | 四棱台主体（前框 + 梯形体 + 后背）、屏幕网格、下分隔线、四角圆点                                        |
| **Box 3D**               | `box3D()` — 连接柱（neck）和底座（base）的线框盒子                                                      |
| **Decorations**          | 三条椭圆轨道环、三个运动粒子、彗星渐变拖影、闪烁十字星、背景静态圆点                                    |

---

## 3. 关键代码怎么读（按功能分块）

### 3.1 等距投影（Isometric Projection）

```glsl
vec2 isoProj(vec3 p, float cY, float sY){
  float cp = cos(u_pitch), sp = sin(u_pitch);
  float x1 = cY * p.x + sY * p.z;       // Y 轴旋转（yaw）
  float z1 = -sY * p.x + cY * p.z;
  return vec2(x1, cp * p.y - sp * z1);   // X 轴旋转（pitch）
}
```

- `u_yaw`：水平旋转角度，拖拽时变化。
- `u_pitch`：俯仰角度，>0 是俯视（看到顶面），<0 是仰视（看到底面）。
- **原理**：先绕 Y 轴旋转（决定看左/右侧），再绕 X 轴旋转（决定俯视/仰视），最后正交投影到 2D。

### 3.2 3D 线框盒子（box3D）

投影 8 个顶点，根据 `u_pitch` 正负决定绘制顶面还是底面，根据 `u_yaw` 决定绘制哪个侧面。每条边用 `sdSegment()` 计算距离，再用 `stroke()` 转换为线条。用于绘制颈部（neck）和底座（base）。

### 3.3 可见性淡出机制

侧面 / 顶面 / 底面的线条通过以下系数控制渐显渐隐，避免穿帮线出现：

```glsl
float sideA  = clamp(abs(yaw) * 6.0, 0.0, 1.0);  // yaw 偏转越大，侧面越清晰
float pitchUpA   = clamp( u_pitch * 4.0, 0.0, 1.0); // 俯视时顶面渐显
float pitchDownA = clamp(-u_pitch * 4.0, 0.0, 1.0); // 仰视时底面渐显
// 侧面方向判断：yaw<0 显右侧，yaw>0 显左侧
if(yaw < 0.0){ /* 绘制右侧面 */ } else { /* 绘制左侧面 */ }
```

### 3.4 多层 alpha-over 合成

输出时按以下层序叠加（后者覆盖前者）：

1. **主结构层**：监视器主体 + 屏幕 + 底座 + 背景装饰，使用全局 `u_color`
2. **backSide 层**：后背左边 + 底边（独立颜色 `u_backSideColor`）
3. **轨道环层**：三条椭圆轨道，各自使用 `u_dotNColor`（可独立着色 / 隐藏）
4. **彗星拖影层**：沿轨道渐变光晕，使用 `u_trailNColor`
5. **粒子圆点层**（最顶层）：三个运动圆点，使用 `u_dotNColor`

### 3.5 缩放（Scale）

```glsl
vec2 uv = (gl_FragCoord.xy / u_resolution - 0.5) / u_scale;
```

`u_scale > 1` 放大图形（UV 空间缩小 → SDF 覆盖更多像素），`u_scale < 1` 缩小图形。

### 3.6 屏保文字（2D Overlay + 碰撞反弹）

“屏保”不是写在 `fragment.glsl` 里，而是由 `RetroComputerShader.vue` 新增的 2D 叠层 canvas 绘制（覆盖在 WebGL canvas 之上），这样能稳定支持自定义字体和 emoji。

关键逻辑（都在 `RetroComputerShader.vue`）：

1. **投影映射**：`projectIsoPointToPixel()` 复用与 shader 一致的 yaw/pitch + scale 思路，把屏幕四角从 3D 投影到像素坐标；并额外做了 y 轴翻转（WebGL 左下原点 → Canvas2D 左上原点）。
2. **屏幕裁剪**：绘制文本前，用 `pBL/pBR/pTR/pTL` 组成 clip path，保证文本只显示在屏幕四边形内。
3. **碰撞边界**：左右边界用 `minX/maxX`；上下边界用 `interpolateYByX()` 沿屏幕上/下边线按当前 x 动态插值，避免“先穿出屏幕再反弹”。
4. **不渲染条件（trade-off）**：如果文本在当前透视下无法放进有效运动区域（例如过长文本），会直接跳过本帧/不渲染，避免抖动和越界。

---

## 4. 参数怎么调（实战版）

这些参数在 Vue 组件的 `defineProps` 里（`index.ts` 有完整类型）：

### 基础外观

| Prop              | 类型          | 默认值        | 说明                                                |
| ----------------- | ------------- | ------------- | --------------------------------------------------- |
| `color`           | `string`      | `'#94b8ee'`   | 全局线框颜色（hex），装饰元素未单独设色时均继承此值 |
| `lineWidth`       | `number`      | `1.8`         | 监视器主体线条粗细（像素），不影响轨道环            |
| `scale`           | `number`      | `1.0`         | 整体缩放，>1 放大 / <1 缩小                         |
| `perspective`     | `Perspective` | `'top-right'` | 视角预设                                            |
| `showDecorations` | `boolean`     | `true`        | 是否显示轨道环、星星等全部装饰                      |
| `glowIntensity`   | `number`      | `1.5`         | hover 荧光呼吸强度（0=无 / 1=默认 / >1=超强）       |

### 3D 几何

| Prop            | 类型     | 默认值     | 说明                                           |
| --------------- | -------- | ---------- | ---------------------------------------------- |
| `bezelDepth`    | `number` | `0.08`     | 前框薄板厚度（3D 单位），越大越厚              |
| `backRatio`     | `number` | `0.7`      | 四棱台后背缩放比（0=收缩成点 / 1=与前面等大）  |
| `backSideColor` | `string` | 同 `color` | 后背左边 + 底边的颜色（hex）                   |
| `backSideAlpha` | `number` | `0`        | 后背左边 + 底边的透明度（0=隐藏 / 1=完全显示） |

### 轨道 & 粒子

| Prop             | 类型      | 默认值  | 说明                                       |
| ---------------- | --------- | ------- | ------------------------------------------ |
| `orbitScale`     | `number`  | `1.0`   | 轨道环整体缩放倍率，>1 扩大覆盖范围        |
| `orbitLineWidth` | `number`  | `1.2`   | 轨道环实线粗细（像素），独立于 `lineWidth` |
| `particleSpeed`  | `number`  | `1.0`   | 粒子沿轨道运行速度倍率                     |
| `showCometTrail` | `boolean` | `false` | 是否显示彗星渐变拖影                       |

### 独立着色（每条轨道）

传 `undefined` 或不传 → 继承全局 `color`；传 `''`（空字符串）→ 该条轨道的轨道环 + 粒子 + 彗星拖影**全部隐藏**。

| Prop          | 说明                   |
| ------------- | ---------------------- |
| `dot1Color`   | 粒子 1 + 轨道环 1 颜色 |
| `dot2Color`   | 粒子 2 + 轨道环 2 颜色 |
| `dot3Color`   | 粒子 3 + 轨道环 3 颜色 |
| `trail1Color` | 轨道 1 彗星拖影颜色    |
| `trail2Color` | 轨道 2 彗星拖影颜色    |
| `trail3Color` | 轨道 3 彗星拖影颜色    |

### 屏保（Screen Saver）

> 说明：屏保绘制在 2D 叠层，不会移除或覆盖 shader 内的屏幕经纬线；两者叠加显示。

| Prop                    | 类型      | 默认值                                                                                                    | 说明                                                 |
| ----------------------- | --------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `screenSaverText`       | `string`  | `''`                                                                                                      | 屏保文本内容（支持 emoji）；空字符串时不渲染         |
| `showScreenSaver`       | `boolean` | `true`                                                                                                    | 屏保总开关                                           |
| `screenSaverOpacity`    | `number`  | `1`                                                                                                       | 屏保透明度（0~1）                                    |
| `screenSaverColor`      | `string`  | `'#94b8ee'`                                                                                               | 屏保文本颜色（hex），默认和线条一致                  |
| `screenSaverFontSize`   | `number`  | `18`                                                                                                      | 字体大小（像素）                                     |
| `screenSaverFontFamily` | `string`  | `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif` | 字体族（CSS `font-family`），默认包含 emoji 字体回退 |
| `screenSaverSpeed`      | `number`  | `1`                                                                                                       | 运动速度倍率（`0` 表示静止，`>1` 更快）              |

### 视角预设对照

| perspective      | 效果                             |
| ---------------- | -------------------------------- |
| `'top-right'`    | 右俯视（默认，最经典的等距视角） |
| `'top-left'`     | 左俯视                           |
| `'top-front'`    | 正面俯视                         |
| `'bottom-right'` | 右仰视                           |
| `'bottom-left'`  | 左仰视                           |
| `'bottom-front'` | 正面仰视                         |
| `'front'`        | 纯正面（无俯仰）                 |

---

## 5. 你以后最常改的地方

- 想改 **整体颜色和大小**：改 Vue 组件的 `color`、`scale`、`lineWidth` 等 props。
- 想改 **轨道 / 粒子行为**：改 `orbitScale`、`orbitLineWidth`、`particleSpeed`、`showCometTrail`、`dotNColor`、`trailNColor`。
- 想改 **屏保行为**：改 `screenSaverText`、`screenSaverFontSize`、`screenSaverFontFamily`、`screenSaverSpeed`、`screenSaverOpacity`、`showScreenSaver`。
- 想改 **视觉算法本身**（如轨道椭圆半径、拖影弧长）：改 `fragment.glsl` 中 Decorations 区块的常量（如 `vec2(0.37, 0.17)`、`trailLen = 2.2`）。
- 想改 **3D 几何形状**：改 `fragment.glsl` 中 `monCtr`、`frontHS`、`neckC/neckH`、`baseC/baseH` 等坐标变量。
- 想新增 **视角预设**：改 `index.ts` 的 `Perspective` 类型和 Vue 组件的 `PERSPECTIVES` 映射。
