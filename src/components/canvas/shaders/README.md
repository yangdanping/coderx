# CodeSpotlight Shader 入门说明

这份文档给前端同学看：从 **不懂 shader** 到 **能自己调参数**。

---

## 1. 一句话先理解：shader 是什么

可以把 GPU 想成“很多很多个小工人”，每个像素一个工人并行干活。  
`fragment.glsl` 就是给每个像素下发的“计算说明书”。

- CPU 方案（旧版 `CodeSpotlightCanvas2D.vue`）：JS 一帧一帧遍历文本，算距离，改颜色。
- GPU 方案（新版 `CodeSpotlight.vue` + shader）：JS 只传少量参数，像素计算交给 GPU 并行做。

通俗比喻：

- 旧版像“一个人拿笔逐个上色”；
- 新版像“把规则交给印刷机，一次性整页打印”。

---

## 2. 新旧版主要区别（你最关心）

### 旧版 `canvas2D`（`CodeSpotlightCanvas2D.vue`）

- 在 JS 循环里按关键词逐个计算亮度和颜色。
- 关键词多时，CPU 压力变大，帧率容易抖动。
- 实现色散这类像素级效果比较费劲。

### 新版 `WebGL + Shader`（`CodeSpotlight.vue`）

- 先把文字画到离屏画布，生成纹理（texture）。
- shader 里按像素计算：聚光灯、凸透镜、渐变、色散、透明度。
- JS 主要做：传鼠标位置、半径、滚动偏移、透镜开关等 uniform。

---

## 3. 这个目录里两个文件各干什么

### `vertex.glsl`

把一个全屏矩形送到屏幕上，并生成 UV 坐标（0~1）：

```glsl
attribute vec2 position;
varying vec2 vUv;

void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}
```

你可以把它理解成：先铺一张“画布底板”，再告诉每个像素“你在这张图上的位置是多少”。

### `fragment.glsl`

真正做视觉效果的核心：每个像素都会执行这里的逻辑。

---

## 4. 关键代码怎么读（按功能分块）

### 4.1 纹理采样与滚动（包含“上边截断”修复）

```glsl
vec2 scrolledUv = vUv;
scrolledUv.y = (1.0 - u_textureHeightRatio) + vUv.y * u_textureHeightRatio;
scrolledUv.x = fract(vUv.x * u_textureRatio + u_scrollOffset);
```

- `u_textureHeightRatio`：修正“纹理被扩到 2 的幂次方后”的高度比例。
- 顶部对齐处理：避免首行文字在上边缘被截掉。
- `u_scrollOffset`：控制横向流动。
- `fract(...)`：让采样坐标循环，形成无缝滚动。

### 4.2 聚光灯范围与距离

```glsl
vec2 distVec = (vUv - u_mouse);
distVec.x *= u_aspect;
float dist = length(distVec);
```

- `u_mouse`：光标位置（归一化坐标）。
- `u_aspect`：宽高比补偿，不然圆会变椭圆。
- `dist`：当前像素到光标中心的距离。

### 4.3 凸透镜效果（Lens Effect）

```glsl
vec2 workingVuv = vUv;
if (u_enableLens > 0.5 && dist < u_radius) {
    float d = dist / u_radius;
    // 使用二次曲线实现平滑的缩放过渡，边缘缩放为1，中心缩放最大
    float amount = (1.0 - d * d) * (1.0 - 1.0 / u_lensMagnification);
    workingVuv = vUv - (vUv - u_mouse) * amount;
}
```

- `u_enableLens`：是否开启凸透镜。
- `u_lensMagnification`：放大倍数（例如 `1.2` 表示中心放大 20%）。
- **原理**：修改采样坐标 `workingVuv`。如果像素在聚光灯内，将其采样点向中心收缩，视觉上就会产生“中心被放大”的效果。

### 4.4 色散环（你常调的核心）

```glsl
float innerRatio = clamp(u_dispersionInnerRatio, 0.0, 1.0);
float outerRatio = max(u_dispersionOuterRatio, 1.01);
float edge = smoothstep(u_radius * innerRatio, u_radius, dist)
           * (1.0 - smoothstep(u_radius, u_radius * outerRatio, dist));
float dispersionOffset = u_dispersion * edge;
```

- `u_dispersion`：三色偏移强度（越大越“分离”）。
- `u_dispersionInnerRatio`：色散开始的位置（越小越靠里）。
- `u_dispersionOuterRatio`：色散结束的位置（越大环越宽）。
- `edge`：只在聚光灯边缘做色散，不是全屏都做。

### 4.5 RGB 分离采样

```glsl
float r = texture2D(u_texture, vec2(fract(scrolledUv.x + dispersionOffset), scrolledUv.y)).r;
float g = texture2D(u_texture, scrolledUv).g;
float b = texture2D(u_texture, vec2(fract(scrolledUv.x - dispersionOffset), scrolledUv.y)).b;
```

- R 向右偏一点，B 向左偏一点，G 不动；
- 三通道错位后，看起来就是“色散/重影”。

---

## 5. 参数怎么调（实战版）

这些参数在 `CodeSpotlight.vue` 的 `defineProps` 里：

- `spotlightRadius`：聚光灯半径（大=照亮范围大）。
- `enableLens`：是否开启凸透镜效果（`true`/`false`）。
- `lensMagnification`：放大倍数（建议 `1.1` ~ `1.5`）。
- `dispersion`：色散强度（大=RGB 偏移更明显）。
- `dispersionInnerRatio`：色散从哪里开始（0~1）。
- `dispersionOuterRatio`：色散到哪里结束（>1）。

建议从这组开始：

```ts
dispersion: 0.005;
dispersionInnerRatio: 0.9;
dispersionOuterRatio: 1.15;
spotlightRadius: 220;
```

如果你觉得“太扩张”：

- 先减小 `dispersion`；
- 再减小 `dispersionOuterRatio`（比如从 `1.3` 到 `1.15`）；
- 仍然太花，就把 `dispersionInnerRatio` 提高一点（比如 `0.9`），让色散更靠边缘。

---

## 6. 为什么还要保留 `CodeSpotlight.vue` 里的顶部安全边距

`CodeSpotlight.vue` 中这段：

```ts
const topSafePadding = Math.ceil(maxFontSize * 0.65) + 6;
let y = Math.max(props.lineHeight, topSafePadding);
const drawY = Math.max(topSafePadding, y + yOffset);
```

它和 shader 顶部对齐修复是“前后两道保险”：

- 这段是 **生产纹理时** 防截断（源头防护）；
- shader 顶部对齐是 **采样纹理时** 防截断（显示防护）。

两者不是冗余，更像“拍照时先摆正，再显示时再校正”。

---

## 7. 你以后最常改的地方

- 想改“效果范围和强度”：改 `CodeSpotlight.vue` 的 props 默认值或调用处传参。
- 想改“视觉算法本身”：改 `fragment.glsl`（比如 `edge` 公式、渐变色、亮度衰减）。
- 想改“滚动方式”：改 `u_scrollOffset` 相关逻辑（`CodeSpotlight.vue`）。

如果你愿意，下一步可以继续做一个“参数对照表（效果前后截图 + 建议区间）”，方便你以后直接按感觉调。
