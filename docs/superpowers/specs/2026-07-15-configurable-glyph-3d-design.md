# 可配置固定字符 3D 轮廓与统一目录设计

## 背景与目标

当前全局背景中的圆角三角箭头已经完成参数化并通过验收。下一阶段增加第二类可复用 3D 图形：固定字符 `$`。字符提供三种源码级可选轮廓，开发者通过修改一个有类型约束的配置值选择风格，不使用注释/取消注释代码的方式切换。

本阶段同时整理 3D 背景图形的目录结构。现有 `triangle-3d` 整体迁入统一的 `shape-3d` 目录，但迁移不改变箭头的轮廓、常量、材质、描边、初始姿态、公转、自旋、fallback、运行时生命周期或测试语义。

本阶段只交付独立字符模块、自动化测试和开发预览，不把字符挂载进 `App.vue`，不让它进入现有全局背景运行时。页面集成、位置、公转和与箭头共用 Canvas 是后续独立设计。

## 已确认决策

- 字符范围固定为 `$`，不是运行时输入任意字符的字体系统。
- 同时保留 `rounded`、`display`、`serif` 三种轮廓，默认使用 `rounded`。
- 三种轮廓共用一套解析、归一化、挤出、材质、描边、fallback 描述和资源释放逻辑。
- 风格由 `GLYPH_3D_CONFIG.outlineStyle` 选择；不通过注释代码切换。
- 字体只作为离线生成轮廓的来源；浏览器运行时不加载 `.ttf/.otf/woff` 或 `typeface.json`。
- 字符模块不复用箭头的运动参数，不修改箭头的运行时。
- 箭头先整体迁移并通过完整回归；本阶段不让箭头改用新字符模块的内部工具。

## 目录结构

```text
src/components/background/shape-3d/
├── config/
│   ├── glyph3d.config.ts
│   └── index.ts
├── triangle/
│   ├── BackgroundTriangle3D.vue
│   ├── triangle3d.ts
│   ├── triangle3d-runtime.ts
│   └── test/
│       ├── BackgroundTriangle3D.test.ts
│       ├── triangle3d.test.ts
│       └── triangle3d-runtime.test.ts
└── glyph/
    ├── glyph3d.ts
    ├── glyph3d-outline.ts
    ├── outlines/
    │   ├── rounded-dollar.svg
    │   ├── display-dollar.svg
    │   ├── serif-dollar.svg
    │   ├── OFL.txt
    │   └── README.md
    ├── preview/
    │   ├── index.html
    │   └── main.ts
    └── test/
        ├── glyph3d-outline.test.ts
        └── glyph3d.test.ts
```

暂不创建 `shared/`。只有箭头和字符都稳定，并且测试证明挤出、材质、帽面边线或 dispose 代码可以共享时，才在后续变更中提取最小公共构建器。

## 箭头迁移规则

使用 `git mv` 将整个目录：

```text
src/components/background/triangle-3d
→ src/components/background/shape-3d/triangle
```

迁移目录内的六个源码和测试文件保持字节级一致。只允许修改外部引用：

- `src/App.vue` 中 `BackgroundTriangle3D.vue` 的导入路径。
- `src/components.d.ts` 中自动生成的组件路径。
- `src/assets/css/test/common-background.test.ts` 中读取组件源码的路径。
- `src/HANDOFF-reusable-3d-shapes-2026-07-15.md` 中指向当前实现的路径。

历史规格和历史计划保留原路径，不批量重写；它们记录的是当时的仓库状态。

迁移前后记录目录中文件的 SHA-256，并验证内容一致。随后先运行现有三组箭头测试、背景层契约测试、类型检查和生产构建。字符实现只有在该迁移检查点通过后才开始。

## 集中配置入口

`config/glyph3d.config.ts` 定义字符配置：

```ts
export type GlyphOutlineStyle = 'rounded' | 'display' | 'serif';

export interface Glyph3DConfig {
  outlineStyle: GlyphOutlineStyle;
  targetHeight: number;
  depth: number;
  curveSegments: number;
  bodyColor: string;
  outlineColor: string;
  capOpacity: number;
  sideOpacity: number;
  outlineOpacity: number;
  outlineWidth: number;
  roughness: number;
  metalness: number;
}

export const FIXED_GLYPH = '$' as const;

export const GLYPH_3D_CONFIG = {
  outlineStyle: 'rounded',
  targetHeight: 112,
  depth: 24,
  curveSegments: 16,
  bodyColor: '#f8cbc6',
  outlineColor: '#f7aaa3',
  capOpacity: 0.28,
  sideOpacity: 0.26,
  outlineOpacity: 0.42,
  outlineWidth: 1,
  roughness: 0.95,
  metalness: 0,
} as const satisfies Glyph3DConfig;
```

开发者只需修改：

```ts
outlineStyle: 'rounded'
// 或 'display' / 'serif'
```

`config/index.ts` 是统一发现入口：

```ts
export { TRIANGLE_SHAPE_CONFIG } from '../triangle/triangle3d';
export { FIXED_GLYPH, GLYPH_3D_CONFIG } from './glyph3d.config';
export type { Glyph3DConfig, GlyphOutlineStyle } from './glyph3d.config';
```

箭头继续在 `triangle3d.ts` 内持有自己的配置真源；统一入口只重新导出它。这样开发者有一个集中入口，又不会为了目录整理改写已验收箭头的内部依赖。

## 三种轮廓资产

视觉比较页使用系统字体，只用于确认方向。提交到仓库的轮廓改用许可清晰的开源字体来源：

| 配置值 | 轮廓方向 | 离线来源 | 生成规则 |
|---|---|---|---|
| `rounded` | 圆润几何 | Nunito ExtraBold，`wght=800` | 导出 `$` 的填充轮廓并清理重叠 |
| `display` | 醒目展示 | Anton Regular | 以 `S` 轮廓和两根圆头竖线构造双线 `$`，离线合并并清理自交 |
| `serif` | 衬线编辑感 | Libre Baskerville Bold，`wght=700` | 导出 `$` 的填充轮廓并保留衬线比例 |

字体来源固定为 Google Fonts 官方仓库中的 OFL 目录：

- `https://github.com/google/fonts/tree/main/ofl/nunito`
- `https://github.com/google/fonts/tree/main/ofl/anton`
- `https://github.com/google/fonts/tree/main/ofl/librebaskerville`

最终仓库只保存清理后的三个 SVG outline、OFL 许可文本和 `README.md` 来源记录，不保存完整字体文件。`README.md` 记录字体家族、字重、原始 URL、生成日期、字符、双竖线组合规则和任何几何清理操作。

每个 SVG 资产满足：

- 只有填充轮廓，不依赖 CSS、`<text>`、mask、filter、stroke 或外部资源。
- 使用明确 `viewBox`，所有子路径闭合。
- 重叠笔画已经合并，不把相交的独立笔画直接交给三角剖分器。
- 保留真实孔洞和断开外轮廓；不在运行时再次统一圆角。
- 文件中不嵌入字体名称作为运行时依赖。

## 轮廓解析与归一化

`glyph3d-outline.ts` 只负责从固定 SVG 资产得到可挤出的形状和 fallback 描述。

```text
选中的 SVG outline
  → SVGLoader.parse(rawSvg)
  → 每个 ShapePath.toShapes()
  → Shape[] 拓扑检查
  → ExtrudeGeometry
  → 根据最终几何边界进行 XY 居中和目标高度归一化
```

项目使用 Three.js `0.185.1`。`SVGLoader.createShapes()` 从 r185 起已经 deprecated，因此实现只调用各个 `ShapePath` 的 `toShapes()`。

归一化发生在挤出几何创建之后：

1. 计算几何真实 bounding box。
2. 以二维高度计算 `scale = targetHeight / boundsHeight`。
3. 只缩放 X/Y，不缩放 Z，确保 `depth` 始终保持配置值。
4. 重新计算边界，并把 XY 几何中心移动到本地原点。
5. 将 Z 平移到 `[-depth / 2, depth / 2]`，使旋转轴穿过几何中心。

不使用字体 baseline、advance width 或 SVG viewBox 中心作为最终旋转中心。

fallback 描述直接来自同一 SVG 资产，包含 `viewBox` 和全部 path `d`，不维护第二套手写坐标。

## 3D 对象与公共接口

`glyph3d.ts` 导出：

```ts
export interface GlyphObject {
  group: Group;
  outlineMaterial: LineMaterial;
  dispose: () => void;
}

export function createGlyphObject(config?: Glyph3DConfig): GlyphObject;
export function createGlyphShapes(style?: GlyphOutlineStyle): Shape[];
export function getGlyphFallback(style?: GlyphOutlineStyle): GlyphFallbackDescriptor;
```

三种风格都经过 `createGlyphObject()`；不为每种风格复制挤出或材质代码。

字符模块配置集中保存当前箭头已经批准的初始视觉数值：

- `depth = 24`
- body color `#f8cbc6`
- outline color `#f7aaa3`
- cap opacity `0.28`
- side opacity `0.26`
- outline opacity `0.42`
- outline width `1`
- `roughness = 0.95`
- `metalness = 0`
- bevel disabled

这些值全部由 `GLYPH_3D_CONFIG` 持有，不从箭头常量导入。这样开发者可在一个文件中管理字符轮廓、尺寸和材质，同时以后调整字符不会意外改变箭头。

边线只描绘正反帽面的边界，不生成连接前后盖的深度线。资源所有权与箭头一致：几何、cap/side material、line geometry 和 line material 都由 `GlyphObject.dispose()` 恰好释放一次。

`group` 保持本地原点位置，不包含页面世界坐标、初始姿态、公转或持续自旋。

## 开发预览

`glyph/preview/` 是独立 Vite 开发入口，不由生产 `index.html` 引用，也不修改路由或 `App.vue`。

预览同时显示三种 `$`，使用同一相机、灯光和缓慢三轴旋转，以便比较：

- 正面识别度。
- 倾斜后的粗细变化。
- 双竖线是否产生破面。
- 衬线细节是否在侧转时消失。
- 正反帽面描边是否完整。

预览可以读取 `GLYPH_3D_CONFIG` 标出当前默认风格，但不提供生产运行时设置面板。

## 错误处理

- SVG 没有解析出填充路径时，`createGlyphShapes()` 抛出包含风格名的错误。
- 形状边界包含非有限值、宽高为零或挤出后没有顶点时，在创建材质前失败。
- 非法风格由 TypeScript 联合类型阻止；对来自非类型安全调用的值仍执行运行时守卫。
- 创建过程中发生异常时，已经创建的 GPU 资源立即释放。
- 字体文件不参与运行时加载，因此不存在字体网络失败或 FOIT/FOUT 路径。

## 测试与验收

### 箭头保护

1. 迁移目录内文件的 SHA-256 前后一致。
2. 三组现有箭头测试原样通过。
3. `App.vue` 仍只挂载一个 `BackgroundTriangle3D`。
4. 原有 fallback、颜色、厚度、轮廓、初始姿态、轨道和三轴自旋断言全部通过。
5. 字符模块不被箭头 runtime、Vue 组件或 `App.vue` 导入。

### 字符轮廓

1. 三种配置都能解析出非空 `Shape[]`。
2. 所有采样点和最终 geometry attributes 都是有限数值。
3. 三种风格产生不同的几何边界或顶点签名。
4. 归一化后的高度为 `112`，Z 深度为 `24`。
5. 一个带孔的合成 SVG fixture 能通过 `ShapePath.toShapes()` 保留 hole，用于验证通用拓扑能力；不假设 `$` 本身一定有孔。
6. fallback 的 viewBox 和 path 数量来自选中的同一 SVG 资产。
7. 帽面边线没有 Z 方向连接线。
8. `dispose()` 恰好释放所有自有 GPU 资源一次。
9. 空轮廓、零面积和非法风格产生明确错误。

### 完整验证

- 字符 focused Vitest。
- 箭头 focused Vitest。
- 完整 Vitest。
- `vue-tsc --noEmit`。
- 相关 ESLint。
- 生产构建。
- `git diff --check`。
- 独立预览中检查三种轮廓的正面和旋转姿态。

## 非目标

- 不允许用户在运行时输入任意字符。
- 不加载完整字体或实现排版、kerning、ligature、中文字符集或 emoji。
- 不把字符加入全局背景，不为它决定页面位置或公转轨迹。
- 不修改箭头的视觉参数或运动参数。
- 不在本阶段让箭头使用字符模块的挤出构建器。
- 不为预览增加长期维护的编辑器、设置面板或导出工具。
- 不承诺三种轮廓在所有旋转角度具有相同屏幕比例。

## 后续扩展点

字符完成并稳定后，可以单独评估：

1. 把帽面边线、材质和 dispose 提取为 `shared/createExtrudedShapeObject()`。
2. 把字符接入一个独立背景组件，或与箭头共享 Canvas。
3. 为其他固定字符增加新的三风格 outline 资产组。
4. 只有确实需要运行时任意字符时，升级为 `TextGeometry + FontLoader` 或 OpenType 解析系统。
