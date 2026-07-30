# Flow 顶栏浅色主题渐变还原设计

## 目标

将顶栏 `Flow` 字样在 light mode 下恢复为此前的绿色到蓝色渐变，同时保持 dark mode 的现有外观不变。

本次只调整 `Flow` 字样的颜色来源，不改变字体、字号、字重、布局、悬停效果、激活下划线或 Flow 页面内容。

## 根因

`NavMenu.vue` 中的 `Flow` 字样复用了首页角色标题后缀 `X` 的 `--xfontStyle` 变量。首页亚克力 `X` 为提高 light mode 对比度而加深渐变后，顶栏 `Flow` 被共享变量连带改变。

dark mode 已显式把首页角色渐变覆盖为旧色值，因此当前 dark mode 的 `Flow` 仍呈现期望的旧颜色。

## 方案

为顶栏 `Flow` 新增独立的 `--flow-nav-gradient` 主题变量，其值固定为此前使用的渐变：

```css
linear-gradient(135deg, rgba(143, 235, 135, 0.7) 30%, rgba(56, 72, 249, 0.7) 100%)
```

`NavMenu.vue` 的 `.special-flow` 改为引用 `--flow-nav-gradient`。首页角色 `X` 继续使用 `--xfontStyle`，两者不再共享颜色入口。

由于 light mode 和 dark mode 都需要上述旧渐变，`--flow-nav-gradient` 只需在 `:root` 定义一次，不添加 dark mode 覆盖。这既还原 light mode，也保证 dark mode 的实际色值不变。

## 组件与文件边界

- `src/assets/css/common.scss`：声明独立的 `--flow-nav-gradient`。
- `src/components/navbar/cpns/NavMenu.vue`：让 `.special-flow` 使用新变量。
- `src/components/navbar/cpns/test/NavMenu.test.ts`：增加样式契约回归检查，防止 `Flow` 再次复用 `--xfontStyle`，并锁定旧渐变色值。

不修改首页组件、Flow 页面组件、主题切换逻辑或其它导航项。

## 测试与验收

- 回归测试先证明当前代码仍让 `.special-flow` 使用 `--xfontStyle`，随后在改动后通过。
- `Flow` 的样式引用为 `var(--flow-nav-gradient)`。
- `--flow-nav-gradient` 精确使用旧 RGBA 色值、角度与 stop 位置。
- `--xfontStyle` 仍服务于首页角色 `X`，现有 light mode 调色不回退。
- dark mode 不新增 `Flow` 专属覆盖，最终计算出的渐变与改动前一致。
- 运行导航组件测试、类型检查和生产构建，确认无回归。

## 非目标

- 不调整 `Home`、`Articles` 的颜色。
- 不调整 `Flow` 的字体、字号、字重或激活状态。
- 不修改 Flow 页面主体内容。
- 不回退首页角色 `X` 的 light mode 渐变。
