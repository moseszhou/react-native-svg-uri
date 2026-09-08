# react-native-svg-uri-yum

Render SVG images in React Native from a URL, a static asset, or an SVG string.
This package is a maintained fork of
[`react-native-svg-uri`](https://github.com/vault-development/react-native-svg-uri)
and uses [`react-native-svg`](https://github.com/software-mansion/react-native-svg)
to render the parsed SVG tree.

Not all the svgs can be rendered, if you find problems fill an issue or a PR in
order to contemplate all the cases

## 与原始 `react-native-svg-uri` 的差异

`react-native-svg-uri-yum` 保持原始 `SvgUri` 的基本使用方式，同时在解析、渲染和工程化方面做了增强：

| 方面     | 原始库基础实现     | `react-native-svg-uri-yum`                                                                                |
| -------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| 输入来源 | 以远程 SVG 为主    | 支持远程 URL、静态资源 `require(...)` 和 `svgXmlData` 字符串                                              |
| 尺寸适配 | 直接使用 SVG 尺寸  | 支持 `aspectFit`、`aspectFill`、`scaleToFill`，分别控制等比适配、等比填充和非等比填充                     |
| 颜色替换 | 基础 fill 处理     | 支持统一替换 `fill`，以及按原始颜色精确映射；支持 `fillAll`                                               |
| SVG 解析 | 基础节点和属性映射 | 扩展渐变、椭圆、多边形、折线、文字等节点，并转换 SVG 属性命名                                             |
| 文字渲染 | 基础文本节点处理   | 保留 SVG 的文字基线，支持 `<text>` / `<tspan>` 文本，并将字体属性转换为 `react-native-svg` 的 `font` 对象 |
| 渐变色   | 部分属性可能被忽略 | 支持 `stop-color` → `stopColor`，渐变色可正常传递                                                         |
| 网络请求 | 每次按组件逻辑请求 | 对相同 URL 复用请求，并在 `source` 变化时重新加载对应资源                                                 |
| 工程化   | JavaScript 入口    | TypeScript 源码、ESM/CJS 构建产物、TypeScript 类型声明和 Jest 测试                                        |

## Differences from the original `react-native-svg-uri`

`react-native-svg-uri-yum` keeps the original `SvgUri` usage model while extending
SVG parsing, rendering, and package tooling:

| Area              | Original implementation                 | `react-native-svg-uri-yum`                                                                                                    |
| ----------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Input sources     | Primarily remote SVGs                   | Remote URLs, static assets via `require(...)`, and `svgXmlData` strings                                                       |
| Sizing            | Uses the SVG dimensions directly        | `aspectFit`, `aspectFill`, and `scaleToFill` modes                                                                            |
| Color replacement | Basic `fill` handling                   | Global fill replacement, exact source-color mapping, and `fillAll`                                                            |
| SVG parsing       | Basic node and attribute mapping        | More gradient, ellipse, polygon, polyline, and text nodes, with SVG attribute normalization                                   |
| Text rendering    | Basic text-node handling                | Preserves SVG text baselines, supports `<text>` / `<tspan>`, and maps font attributes to the `react-native-svg` `font` object |
| Gradients         | Some attributes may be ignored          | Maps `stop-color` to `stopColor` so gradient colors are preserved                                                             |
| Network requests  | Requests follow the component lifecycle | Reuses requests for the same URL and reloads when `source` changes                                                            |
| Tooling           | JavaScript entry point                  | TypeScript source, ESM/CJS bundles, type declarations, and Jest tests                                                         |

## Installation

```bash
yarn add react-native-svg-uri-yum react-native-svg
```

## Props

| Prop         | Type                                           | Default       | Description                                                                   |
| ------------ | ---------------------------------------------- | ------------- | ----------------------------------------------------------------------------- |
| `source`     | `{ uri: string } \| number`                    | —             | Remote URL or static asset, similar to the `<Image />` `source` prop          |
| `svgXmlData` | `string`                                       | —             | Render an SVG string directly                                                 |
| `width`      | `number \| string`                             | —             | Render width; falls back to `style.width`                                     |
| `height`     | `number \| string`                             | —             | Render height; falls back to `style.height`                                   |
| `mode`       | `'aspectFit' \| 'aspectFill' \| 'scaleToFill'` | `scaleToFill` | Controls the root SVG scaling strategy                                        |
| `fill`       | `string \| FillItem[]`                         | —             | Replace all fills with one color, or map selected source colors to new colors |
| `fillAll`    | `boolean`                                      | `false`       | Apply the `fill` value to the whole SVG tree                                  |
| `style`      | `StyleProp<ViewStyle>`                         | —             | Style for the outer container                                                 |
| `onLoad`     | `() => void`                                   | —             | Called after a source resource is fetched and its XML is validated                              |
| `onError`    | `(error: Error) => void`                        | —             | Called when source loading, XML parsing, or node conversion fails             |

### 加载失败回调 / Error callback

`onError?: (error: Error) => void` 在静态资源 URI 解析、网络请求、HTTP 非成功状态、
响应正文读取、SVG XML 解析或节点转换失败时调用。远程内容需通过 XML 校验后才触发
`onLoad`；直接传入 `svgXmlData` 不触发 `onLoad`。未提供 `onError` 时保留警告日志。

```tsx
<SvgUri
  source={{ uri: 'https://example.com/icon.svg' }}
  onError={(error: Error) => console.warn('SVG 加载失败', error.message)}
/>
```

- 回调接收 `Error`，不是 React Native 的 `nativeEvent` 对象。
- 已卸载组件及被替换或移除资源的未完成请求不再触发回调。
- 失败请求会移出缓存，再次挂载或切换资源时可以重新请求；不会自动重试。
- 解析器仅报告 `warning` 时保留修复结果并继续渲染，不触发 `onError`；`error`、`fatalError` 或 SVG 结构校验失败时显示空内容并触发 `onError`。支持 XML 声明、注释及 `<svg/>`。
- 不支持的 SVG 子节点仍按原有逻辑跳过；回调不捕获原生绘制层异常。

`onError` receives an `Error` for source resolution, network, unsuccessful HTTP
status, response body, XML parsing, or node conversion failures. Source resources
trigger `onLoad` after fetching and XML validation; inline `svgXmlData` does not.
Warnings are retained when no callback is provided. Callbacks from unmounted
components and replaced or removed sources are ignored. Failed requests are
evicted from the cache so a subsequent mount or source change can retry; retries
are not automatic. Parser warnings retain the repaired SVG and do not trigger `onError`. Parser
errors, fatal errors, or failed SVG structure validation render empty content and
trigger `onError`. Unsupported child elements are still skipped, and native drawing errors
are outside this callback's scope.

`FillItem` has the following shape:

```ts
type FillItem = { color: string; fill: string };
```

### Scaling modes

```tsx
<SvgUri width={240} height={84} mode='aspectFit' svgXmlData={svgXmlData} />
```

- `aspectFit`: preserve the SVG aspect ratio and fit it inside the container.
- `aspectFill`: preserve the SVG aspect ratio and fill the container; overflow may be cropped.
- `scaleToFill`: scale the X and Y axes independently to fill the container.

SVG text attributes such as `font-size` and `font-weight` are normalized to the
`font={{ fontSize, fontWeight }}` shape expected by `react-native-svg`. The
original `y` baseline is preserved, so text is not shifted upward by the parser.

## Known Bugs

- [ANDROID] There is a problem with static SVG file on Android,
  Works OK in debug mode but fails to load the file in release mode.
  At the moment the only workaround is to pass the svg content in the svgXmlData prop.

## <a name="Usage">Usage</a>

Here's a simple example:

```javascript
import SvgUri from 'react-native-svg-uri-yum';

const TestSvgUri = () => (
  <View style={styles.container}>
    <SvgUri width='200' height='200' source={{ uri: 'http://thenewcode.com/assets/images/thumbnails/homer-simpson.svg' }} fill='#00FF00' />

    <SvgUri
      source={{ uri: 'http://thenewcode.com/assets/images/thumbnails/homer-simpson.svg' }}
      fill={[
        {
          color: '#76BFFF',
          fill: 'red',
        },
        { color: '#659CF8', fill: 'green' },
        { color: '#E8A200', fill: 'blue' },
        { color: '#ECD300', fill: 'pink' },
        { color: '#787CF5', fill: 'pink' },
      ]}
    />
  </View>
);
```

or a static file

```javascript
<SvgUri width='200' height='200' source={require('./img/homer.svg')} />
```

This will render:

![Component example](./screenshoots/sample.png)

## Testing

1. Install dependencies with `yarn install`.
2. Run tests with `yarn test`.
